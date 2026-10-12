import fs from "fs";
import path from "path";
import type { SymlinkRecord } from "./storage";

/**
 * - `ok`: the link is there, points to the recorded source, and the source exists
 * - `broken`: the link is there and points to the recorded source, but the source is gone
 * - `missing`: nothing is at the link's path
 * - `replaced`: something else is at the link's path (a real file or folder, or a link to somewhere else)
 * - `unknown`: the link's path couldn't be read (e.g. no permission)
 */
export type LinkStatus = "ok" | "broken" | "missing" | "replaced" | "unknown";

function errorCode(error: unknown) {
    return (error as NodeJS.ErrnoException).code;
}

export function lstatOrUndefined(filePath: string): fs.Stats | undefined {
    try {
        return fs.lstatSync(filePath);
    } catch (error) {
        if (errorCode(error) === "ENOENT" || errorCode(error) === "ENOTDIR") return undefined;
        throw error;
    }
}

/** True if `child` is `parent` or somewhere below it. */
export function isInside(child: string, parent: string) {
    const relative = path.relative(parent, child);
    return (
        relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
    );
}

export function getLinkStatus({ source, destination }: SymlinkRecord): LinkStatus {
    let target: string;
    try {
        target = fs.readlinkSync(destination);
    } catch (error) {
        const code = errorCode(error);
        if (code === "ENOENT" || code === "ENOTDIR") return "missing";
        if (code === "EINVAL") return "replaced"; // exists, but isn't a symlink
        return "unknown";
    }
    if (path.resolve(path.dirname(destination), target) !== path.resolve(source)) return "replaced";
    return fs.existsSync(destination) ? "ok" : "broken";
}

/** True if the link this extension created is still at the record's destination. */
export function isOwnLink(status: LinkStatus) {
    return status === "ok" || status === "broken";
}

/**
 * Creates a symlink at `linkPath` pointing to `source`. With `replace`, an existing symlink at `linkPath` is
 * swapped for the new one. Anything that isn't a symlink is never replaced.
 */
export async function createLink(source: string, linkPath: string, replace: boolean) {
    if (!replace) {
        // Fails with EEXIST if anything is already there.
        await fs.promises.symlink(source, linkPath);
        return;
    }

    const existing = lstatOrUndefined(linkPath);
    if (existing && !existing.isSymbolicLink()) {
        throw new Error(`${linkPath} is not a symlink, so it won't be replaced`);
    }

    // Create the new link alongside the old one and rename it over the top, so the old link is only gone
    // once the new one is in place.
    const tempPath = path.join(path.dirname(linkPath), `.${path.basename(linkPath)}.${process.pid}.tmp`);
    await fs.promises.symlink(source, tempPath);
    try {
        await fs.promises.rename(tempPath, linkPath);
    } catch (error) {
        await fs.promises.unlink(tempPath).catch(() => undefined);
        throw error;
    }
}

/**
 * Removes the link at the record's destination, but only if it is still the link this extension created.
 * Returns false if there was nothing of ours to remove.
 */
export async function removeLink(record: SymlinkRecord) {
    if (!isOwnLink(getLinkStatus(record))) return false;
    await fs.promises.unlink(record.destination);
    return true;
}
