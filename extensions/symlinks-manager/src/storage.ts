import fs from "fs";
import path from "path";
import { environment } from "@raycast/api";

export interface SymlinkRecord {
    name: string;
    /** Absolute path the link points to. */
    source: string;
    /** Absolute path of the link itself. */
    destination: string;
}

const STORE_FILE = path.join(environment.supportPath, "symlinks.json");

function isSymlinkRecord(value: unknown): value is SymlinkRecord {
    if (typeof value !== "object" || value === null) return false;
    const { name, source, destination } = value as Record<string, unknown>;
    return (
        typeof name === "string" &&
        typeof source === "string" &&
        path.isAbsolute(source) &&
        typeof destination === "string" &&
        path.isAbsolute(destination)
    );
}

export function getSymlinks(): SymlinkRecord[] {
    let data: string;
    try {
        data = fs.readFileSync(STORE_FILE, "utf-8");
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
        throw error;
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(data);
    } catch {
        // Don't overwrite a file we can't read; the user may want to fix it by hand.
        throw new Error(`${STORE_FILE} is not valid JSON`);
    }
    if (!Array.isArray(parsed)) {
        throw new Error(`${STORE_FILE} does not contain a list of symlinks`);
    }

    // Entries from disk are untrusted: keep only well-formed ones, and only their known fields.
    return parsed.filter(isSymlinkRecord).map(({ name, source, destination }) => ({ name, source, destination }));
}

function writeSymlinks(symlinks: SymlinkRecord[]) {
    fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
    // Write to a temp file and rename it into place, so a crash never leaves a half-written store.
    const tempFile = `${STORE_FILE}.${process.pid}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(symlinks, null, 2), { encoding: "utf-8", mode: 0o600 });
    fs.renameSync(tempFile, STORE_FILE);
}

/** Saves a record, replacing any existing record for the same link path. */
export function saveSymlink(record: SymlinkRecord) {
    const symlinks = getSymlinks().filter((s) => s.destination !== record.destination);
    symlinks.push(record);
    writeSymlinks(symlinks);
}

export function removeSymlink(destination: string) {
    writeSymlinks(getSymlinks().filter((s) => s.destination !== destination));
}
