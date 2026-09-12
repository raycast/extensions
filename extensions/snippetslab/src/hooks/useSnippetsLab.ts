import { getApplications } from "@raycast/api";
import { execa } from "execa";
import fs from "fs";
import PQueue from "p-queue";
import path from "path";
import plist from "plist";
import { useEffect, useState } from "react";
import { getPreferences } from "../models/preferences";

const BUNDLE_ID_APP_STORE = "com.renfei.SnippetsLab";
const BUNDLE_ID_SETAPP = "com.renfei.snippetslab-setapp";
const CLI_RELPATH = "Contents/Helpers/lab";
const INFO_PLIST_RELPATH = "Contents/Info.plist";

/**
 * A serial queue for all operations using the command-line utility.
 *
 * Although we could run commands in parallel, all requests are ultimately serviced by SnippetsLab's
 * extension services which support limited concurrency. Using a queue here allows us to cancel
 * stale requests more effectively.
 */
const queue = new PQueue({ concurrency: 1 });

/**
 * A registry of currently queued (including running) tasks.
 *
 * This maps from subcommand names to the task's abort controllers. Enqueuing a new task always
 * cancels the previous one with the same subcommand. Cancellation is on a best-effort basis and
 * does not force the running process to stop. However, the task's result will be ignored and any
 * queued-but-not-yet-started tasks will exit immediately.
 */
const queuedTasks = new Map<string, AbortController>();

/** Primary API to interact with the host app. */
export interface SnippetsLab {
    /** Runs the `lab` command with given subcommand and arguments. */
    run: (subcommand: string, args: string[]) => Promise<string>;

    /** Opens the snippet/fragment matching the given uuids. */
    open: (snippet: string, fragment: string) => Promise<void>;
}

/** Manages all interactions with SnippetsLab.app. */
export function useSnippetsLab() {
    const [isInitializing, setInitializing] = useState<boolean>(true);
    const [initializationError, setInitializationError] = useState<Error>();
    const [resolvedCliPath, setResolvedCliPath] = useState<string>();
    const [appVersion, setAppVersion] = useState<string>();

    useEffect(() => {
        const checkCli = async () => {
            try {
                const cliPath = await findCliPath();
                await validateCli(cliPath);
                setResolvedCliPath(cliPath);
                setInitializationError(undefined);
            } catch (err) {
                setInitializationError(err as Error);
            } finally {
                setInitializing(false);
            }
        };

        checkCli();
    }, []);

    const findCliPath = async (): Promise<string> => {
        const preferencesValue = getPreferences().cliPath;

        if (preferencesValue) {
            return preferencesValue;
        }

        const apps = await getApplications();
        const app = apps.find(
            (app) => app.bundleId === BUNDLE_ID_APP_STORE || app.bundleId === BUNDLE_ID_SETAPP,
        );

        if (!app) {
            throw new Error("SnippetsLab.app not found. Is it installed?");
        }

        const infoPlistPath = path.join(app.path, INFO_PLIST_RELPATH);
        const infoPlistContents = fs.readFileSync(infoPlistPath, "utf8");
        const infoDictionary = plist.parse(infoPlistContents) as Readonly<plist.PlistObject>;
        setAppVersion(infoDictionary.CFBundleShortVersionString as string);

        return path.join(app.path, CLI_RELPATH);
    };

    // Make sure the binary has executable permissions.
    const validateCli = (cliPath: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            fs.access(cliPath, fs.constants.X_OK, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    };

    const run = async (subcommand: string, args: string[]): Promise<string> => {
        if (!resolvedCliPath) {
            throw new Error("CLI path is not resolved yet.");
        }

        const command = `lab ${subcommand} ${args.join(" ")}`;
        console.log("Requested:", command);
        queuedTasks.get(subcommand)?.abort();
        const controller = new AbortController();
        queuedTasks.set(subcommand, controller);

        const task = async () => {
            // Abort immediately and do not execute the command if it has been cancelled.
            if (controller.signal.aborted) {
                console.log("Aborted:", command);
                throw new Error("AbortError");
            }
            try {
                console.log("Running:", command);
                const { stdout } = await execa(resolvedCliPath, [subcommand, "--launch", ...args]);
                console.log("Received:", command, `(${stdout.length} bytes)`);
                return stdout;
            } finally {
                if (queuedTasks.get(subcommand) === controller) {
                    queuedTasks.delete(subcommand);
                }
            }
        };

        return queue.add(task) as Promise<string>;
    };

    const open = async (snippet: string, fragment: string) => {
        console.log(`Running: open snippetslab://snippet/${snippet}/${fragment}/`);
        await execa("open", [`snippetslab://snippet/${snippet}/${fragment}/`]);
    };

    return {
        isInitializing,
        initializationError,
        appVersion, // undefined when using a custom CLI path in preferences.
        app: { run, open },
    };
}
