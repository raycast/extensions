import type { Application } from "@raycast/api";
import {
  execFile,
  type ExecFileException,
  type ExecFileOptionsWithStringEncoding,
} from "node:child_process";
import { lstat, realpath } from "node:fs/promises";
import { extname, isAbsolute, join } from "node:path";
import { IntegrationError } from "./errors";

export const APP_BUNDLE_ID = "com.hjm.harbordrop";
export const APP_TEAM_ID = "54V3JMN338";
export const APP_REQUIREMENT =
  `anchor apple generic and identifier "${APP_BUNDLE_ID}" ` +
  `and certificate leaf[subject.OU] = "${APP_TEAM_ID}"`;

export interface AppIdentity {
  canonicalPath: string;
  fingerprint: string;
}

export type CodeSignRunner = (
  args: readonly string[],
  signal: AbortSignal,
) => Promise<void>;

type CodeSignExecutor = (
  file: string,
  args: string[],
  options: ExecFileOptionsWithStringEncoding,
  callback: (
    error: ExecFileException | null,
    stdout: string,
    stderr: string,
  ) => void,
) => void;

function checkCancellation(signal?: AbortSignal): void {
  if (signal?.aborted) throw new IntegrationError("cancelled");
}

export function createCodeSignRunner(
  executor: CodeSignExecutor = execFile,
): CodeSignRunner {
  return async (args, signal) => {
    checkCancellation(signal);
    await new Promise<void>((resolve, reject) => {
      executor(
        "/usr/bin/codesign",
        [...args],
        {
          shell: false,
          encoding: "utf8",
          cwd: "/",
          env: { PATH: "/usr/bin:/bin", LANG: "C", LC_ALL: "C" },
          timeout: 15000,
          maxBuffer: 64 * 1024,
          killSignal: "SIGKILL",
          signal,
        },
        (error) => {
          if (signal.aborted) reject(new IntegrationError("cancelled"));
          else if (!error) resolve();
          // codesign's nonzero exit alone cannot distinguish invalid code from
          // inaccessible resources. Both block use without alleging tampering.
          else reject(new IntegrationError("appVerificationFailed"));
        },
      );
    }).catch((error: unknown) => {
      if (error instanceof IntegrationError) throw error;
      throw new IntegrationError(
        signal.aborted ? "cancelled" : "appVerificationFailed",
      );
    });
    checkCancellation(signal);
  };
}

export async function readAppIdentity(path: string): Promise<AppIdentity> {
  if (
    !isAbsolute(path) ||
    Buffer.byteLength(path, "utf8") > 4096 ||
    [...path].some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  )
    throw new IntegrationError("appVerificationFailed");
  try {
    const canonicalPath = await realpath(path);
    if (extname(canonicalPath).toLowerCase() !== ".app")
      throw new IntegrationError("appVerificationFailed");
    const entries = [
      ["", true, false],
      ["Contents", true, false],
      ["Contents/Info.plist", false, false],
      ["Contents/MacOS", true, false],
      ["Contents/MacOS/HarborDrop", false, false],
      ["Contents/_CodeSignature", true, true],
      ["Contents/_CodeSignature/CodeResources", false, true],
    ] as const;
    const identities = await Promise.all(
      entries.map(async ([relative, directory, optional]) => {
        const value = await lstat(join(canonicalPath, relative), {
          bigint: true,
        }).catch((error: NodeJS.ErrnoException) => {
          if (optional && error.code === "ENOENT") return undefined;
          throw error;
        });
        // Let codesign classify an unsigned bundle; missing seals are not I/O errors.
        if (!value) return `${relative}:missing`;
        if (directory ? !value.isDirectory() : !value.isFile())
          throw new IntegrationError("appVerificationFailed");
        return [
          relative,
          value.dev,
          value.ino,
          value.mode,
          value.uid,
          value.gid,
          value.nlink,
          value.size,
          value.mtimeNs,
          value.ctimeNs,
        ]
          .map(String)
          .join(":");
      }),
    );
    if ((await realpath(path)) !== canonicalPath)
      throw new IntegrationError("appChanged");
    return { canonicalPath, fingerprint: JSON.stringify(identities) };
  } catch (error) {
    if (error instanceof IntegrationError) throw error;
    throw new IntegrationError("appVerificationFailed");
  }
}

interface Verification {
  promise: Promise<void>;
  controller: AbortController;
  waiters: number;
  settled: boolean;
}

function awaitVerification(
  verification: Verification,
  signal?: AbortSignal,
): Promise<void> {
  verification.waiters += 1;
  return new Promise<void>((resolve, reject) => {
    let finished = false;
    const finish = (error?: unknown) => {
      if (finished) return;
      finished = true;
      signal?.removeEventListener("abort", abort);
      verification.waiters -= 1;
      if (!verification.waiters && !verification.settled)
        verification.controller.abort();
      if (error) reject(error);
      else resolve();
    };
    const abort = () => finish(new IntegrationError("cancelled"));
    signal?.addEventListener("abort", abort, { once: true });
    verification.promise.then(() => finish(), finish);
    if (signal?.aborted) abort();
  });
}

export function createOfficialAppVerifier(
  dependencies: {
    runCodesign?: CodeSignRunner;
    readIdentity?: (path: string) => Promise<AppIdentity>;
  } = {},
): (app: Application, signal?: AbortSignal) => Promise<Application> {
  const runCodesign = dependencies.runCodesign ?? createCodeSignRunner();
  const readIdentity = dependencies.readIdentity ?? readAppIdentity;
  const running = new Map<string, Verification>();

  async function requireUnchanged(path: string, expected: AppIdentity) {
    try {
      const current = await readIdentity(path);
      if (
        current.canonicalPath !== expected.canonicalPath ||
        current.fingerprint !== expected.fingerprint
      )
        throw new IntegrationError("appChanged");
    } catch {
      throw new IntegrationError("appChanged");
    }
  }

  return async (app, signal) => {
    checkCancellation(signal);
    if (app.bundleId !== APP_BUNDLE_ID)
      throw new IntegrationError("appSignatureInvalid");
    const before = await readIdentity(app.path);
    checkCancellation(signal);
    const key = JSON.stringify(before);
    let verification = running.get(key);
    if (!verification || verification.controller.signal.aborted) {
      const controller = new AbortController();
      verification = {
        controller,
        waiters: 0,
        settled: false,
        promise: Promise.resolve(),
      };
      const current = verification;
      current.promise = (async () => {
        // The top-level requirement must not be imposed on nested helper IDs.
        await runCodesign(
          [
            "--verify",
            "--strict",
            "--all-architectures",
            "--test-requirement",
            `=${APP_REQUIREMENT}`,
            before.canonicalPath,
          ],
          controller.signal,
        );
        await runCodesign(
          [
            "--verify",
            "--deep",
            "--strict",
            "--all-architectures",
            before.canonicalPath,
          ],
          controller.signal,
        );
        await requireUnchanged(before.canonicalPath, before);
      })().finally(() => {
        current.settled = true;
        if (running.get(key) === current) running.delete(key);
      });
      running.set(key, current);
    }
    await awaitVerification(verification, signal);
    checkCancellation(signal);
    // Each caller also checks its original path, including a symlink alias.
    await requireUnchanged(app.path, before);
    checkCancellation(signal);
    return { ...app, path: before.canonicalPath };
  };
}

export const assertOfficialApp = createOfficialAppVerifier();
