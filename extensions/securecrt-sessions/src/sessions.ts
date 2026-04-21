import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

export type Session = {
    name: string;
    sessionPath: string;
    filePath: string;
    folder?: string;
    hostname?: string;
    protocol?: string;
};

export const DEFAULT_SECURECRT_CONFIG_PATH = "~/Library/Application Support/VanDyke/SecureCRT/Config";
const AUTO_CONFIG_PATH_VALUE = "auto";
const DEFAULTS_COMMAND = "/usr/bin/defaults";
const SECURECRT_PREFERENCES_DOMAIN = "com.vandyke.SecureCRT";
const SECURECRT_CONFIG_PATH_KEY = "Config Path";

const execFileAsync = promisify(execFile);

function expandHome(input: string): string {
    if (input === "~") return os.homedir();
    if (input.startsWith("~/")) return path.join(os.homedir(), input.slice(2));
    return input;
}

async function pathExists(p: string): Promise<boolean> {
    try {
        await fs.access(p);
        return true;
    } catch {
        return false;
    }
}

async function readSecureCrtConfigPath(): Promise<string | undefined> {
    try {
        const { stdout } = await execFileAsync(DEFAULTS_COMMAND, [
            "read",
            SECURECRT_PREFERENCES_DOMAIN,
            SECURECRT_CONFIG_PATH_KEY,
        ]);
        const configPath = stdout.trim();

        return configPath || undefined;
    } catch {
        return undefined;
    }
}

async function resolveConfigPath(configPathInput?: string): Promise<string> {
    const overridePath = configPathInput?.trim();
    const shouldAutoDetect = !overridePath || overridePath.toLowerCase() === AUTO_CONFIG_PATH_VALUE;
    const detectedPath = shouldAutoDetect
        ? (await readSecureCrtConfigPath()) || DEFAULT_SECURECRT_CONFIG_PATH
        : overridePath;

    return expandHome(detectedPath);
}

export async function readSessionMetadata(filePath: string): Promise<Pick<Session, "hostname" | "protocol">> {
    try {
        const content = await fs.readFile(filePath, "utf8");
        const hostname = findIniValue(content, ["Hostname", "[SSH2] Hostname"]);
        const protocol = findIniValue(content, ["Protocol Name"]);

        return { hostname, protocol };
    } catch {
        return {};
    }
}

function findIniValue(content: string, keys: string[]): string | undefined {
    for (const key of keys) {
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const match = content.match(new RegExp(`^(?:S:")?${escapedKey}(?:"|)?\\s*=\\s*(.+)$`, "im"));
        const value = match?.[1]?.trim();

        if (value) return value;
    }

    return undefined;
}

function isSessionFile(entry: fs.Dirent): boolean {
    if (!entry.isFile()) return false;
    if (!entry.name.toLowerCase().endsWith(".ini")) return false;

    const baseName = path.basename(entry.name, path.extname(entry.name)).toLowerCase();

    return !baseName.startsWith("__");
}

async function walkSessionsDir(rootDir: string, readMetadata: boolean, currentDir = rootDir): Promise<Session[]> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    const sessions: Session[] = [];

    for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
            sessions.push(...(await walkSessionsDir(rootDir, readMetadata, fullPath)));
            continue;
        }

        if (!isSessionFile(entry)) continue;

        const relative = path.relative(rootDir, fullPath);
        const withoutExt = relative.replace(/\.ini$/i, "");
        const sessionPath = withoutExt.split(path.sep).join("/");

        const parts = sessionPath.split("/");
        const name = parts[parts.length - 1];
        const folder = parts.length > 1 ? parts.slice(0, -1).join("/") : "";
        const metadata = readMetadata ? await readSessionMetadata(fullPath) : {};

        sessions.push({
            name,
            sessionPath,
            filePath: fullPath,
            folder,
            ...metadata,
        });
    }

    return sessions.sort((a, b) => a.sessionPath.localeCompare(b.sessionPath));
}

export async function loadSessions(configPathInput?: string, readMetadata = true): Promise<Session[]> {
    const configPath = await resolveConfigPath(configPathInput);
    const sessionsDir = path.join(configPath, "Sessions");

    if (!(await pathExists(configPath))) {
        throw new Error(`SecureCRT config path not found: ${configPath}`);
    }

    if (!(await pathExists(sessionsDir))) {
        throw new Error(`Sessions folder not found: ${sessionsDir}`);
    }

    return walkSessionsDir(sessionsDir, readMetadata);
}
