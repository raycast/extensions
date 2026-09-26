import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
let cachedExecutable: { preferencePath?: string; executablePath: string } | undefined;

export class KeydenPathError extends Error {
    override name = "KeydenPathError";
}

export type TotpEntry = {
    id: string;
    issuer: string;
    account: string;
    code: string;
    isPinned: boolean;
    expiresAt: number;
};

export type TotpSnapshot = {
    entries: TotpEntry[];
    fetchedAt: number;
};

function expandHome(inputPath: string) {
    if (inputPath === "~") return os.homedir();
    if (inputPath.startsWith(`~${path.sep}`)) return path.join(os.homedir(), inputPath.slice(2));
    return inputPath;
}

async function isExecutable(executablePath: string) {
    try {
        const fileStat = await stat(executablePath);
        await access(executablePath, constants.X_OK);
        return fileStat.isFile();
    } catch {
        return false;
    }
}

export async function resolveKeydenExecutable(configuredPath?: string) {
    const preferencePath = configuredPath?.trim();

    if (cachedExecutable && cachedExecutable.preferencePath === preferencePath) return cachedExecutable.executablePath;

    if (preferencePath) {
        const expandedPath = expandHome(preferencePath);

        if (!path.isAbsolute(expandedPath) || !(await isExecutable(expandedPath))) {
            throw new KeydenPathError(
                "The configured Keyden CLI path is invalid or not executable. Update it in Command Preferences.",
            );
        }

        cachedExecutable = { preferencePath, executablePath: expandedPath };
        return expandedPath;
    }

    const pathCandidates = (process.env.PATH ?? "")
        .split(path.delimiter)
        .filter(Boolean)
        .map((directory) => path.join(directory, "keyden"));
    const candidates = [...new Set(["/usr/local/bin/keyden", "/opt/homebrew/bin/keyden", ...pathCandidates])];

    for (const candidate of candidates) {
        if (await isExecutable(candidate)) {
            cachedExecutable = { preferencePath, executablePath: candidate };
            return candidate;
        }
    }

    throw new KeydenPathError(
        "Keyden CLI was not found automatically. Set its full executable path in Command Preferences.",
    );
}

export function parseKeydenList(output: string, fetchedAt = Date.now()): TotpEntry[] {
    return output
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, index) => {
            const isPinned = line.startsWith("📌");
            const normalizedLine = isPinned ? line.slice("📌".length).trimStart() : line;
            const resultSeparator = normalizedLine.lastIndexOf(" -> ");

            if (resultSeparator === -1) {
                throw new Error(`Unable to parse Keyden output on line ${index + 1}.`);
            }

            const identity = normalizedLine.slice(0, resultSeparator).trim();
            const result = normalizedLine.slice(resultSeparator + " -> ".length).trim();
            const resultMatch = result.match(/^(\d+)\s+\((\d+)s\)$/);
            const identitySeparator = identity.indexOf(":");

            if (!resultMatch || !identity) {
                throw new Error(`Unable to parse Keyden output on line ${index + 1}.`);
            }

            const issuer = (identitySeparator === -1 ? identity : identity.slice(0, identitySeparator)).trim();
            const account = identitySeparator === -1 ? "" : identity.slice(identitySeparator + 1).trim();
            const [, code, remainingSeconds] = resultMatch;

            if (!issuer || (identitySeparator !== -1 && !account)) {
                throw new Error(`Keyden returned an incomplete account on line ${index + 1}.`);
            }

            return {
                id: `${issuer}:${account}:${index}`,
                issuer,
                account,
                code,
                isPinned,
                expiresAt: fetchedAt + Number(remainingSeconds) * 1_000,
            };
        });
}

export async function listTotps(configuredPath?: string): Promise<TotpSnapshot> {
    try {
        const executablePath = await resolveKeydenExecutable(configuredPath);
        const { stdout } = await execFileAsync(executablePath, ["list"], {
            encoding: "utf8",
            timeout: 5_000,
        });
        const fetchedAt = Date.now();

        return {
            entries: parseKeydenList(stdout, fetchedAt),
            fetchedAt,
        };
    } catch (error) {
        const executionError = error as Error & { code?: string | number };

        if (executionError.code === "ENOENT") {
            cachedExecutable = undefined;
            throw new KeydenPathError(
                "The Keyden CLI executable is no longer available. Update its path in Command Preferences.",
            );
        }

        throw error;
    }
}
