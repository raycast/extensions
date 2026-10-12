import crypto from "crypto";
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

type LinkLocation = Pick<SymlinkRecord, "source" | "destination">;

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

export function getLinkStatus({ source, destination }: LinkLocation): LinkStatus {
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
 * Returns why a link to `source` can't be created in `destinationDir`, if it can't. Compares real paths, so a
 * folder symlink in either path can't hide the problem.
 */
export function placementProblem(source: string, destinationDir: string): string | undefined {
    const realDestination = fs.realpathSync.native(destinationDir);
    // The link takes the source's name, so in the source's own folder it would collide with the source itself.
    if (realDestination === fs.realpathSync.native(path.dirname(source))) {
        return "This folder already holds the source";
    }
    if (isInside(realDestination, fs.realpathSync.native(source))) {
        return "Destination is inside the source, which would create a loop";
    }
}

/** A short unique name next to `filePath`. It doesn't grow with `filePath`'s own name, so it always fits. */
function tempPathNextTo(filePath: string) {
    return path.join(path.dirname(filePath), `.symlinks-manager-${crypto.randomBytes(6).toString("hex")}.tmp`);
}

/**
 * Atomically moves whatever is at `filePath` to a temporary name, where it can be checked without anything else
 * changing it. Returns the temporary path, or undefined if nothing was there.
 */
async function moveAside(filePath: string) {
    const aside = tempPathNextTo(filePath);
    try {
        await fs.promises.rename(filePath, aside);
    } catch (error) {
        if (errorCode(error) === "ENOENT") return undefined;
        throw error;
    }
    return aside;
}

/** Moves `from` back to `to` without overwriting anything that has appeared at `to` in the meantime. */
async function moveBack(from: string, to: string) {
    try {
        const stats = await fs.promises.lstat(from);
        if (stats.isSymbolicLink()) {
            await fs.promises.symlink(await fs.promises.readlink(from), to);
            await fs.promises.unlink(from);
        } else if (stats.isDirectory()) {
            // rename never overwrites a file, or a folder that has anything in it.
            await fs.promises.rename(from, to);
        } else {
            await fs.promises.link(from, to);
            await fs.promises.unlink(from);
        }
    } catch (error) {
        throw new Error(`Couldn't put ${to} back. It is safe at ${from}.`, { cause: error });
    }
}

/**
 * Creates a symlink at `linkPath` pointing to `source`, then calls `save` to record it. If `save` throws, the new
 * link is removed and any link it replaced is put back.
 *
 * With `replace`, an existing symlink at `linkPath` is swapped for the new one. Anything that isn't a symlink is
 * never replaced.
 */
export async function createLink(source: string, linkPath: string, replace: boolean, save: () => void) {
    // Check the existing entry after moving it aside, so nothing can take its place between the check and the swap.
    const previous = replace ? await moveAside(linkPath) : undefined;
    if (previous && !(await fs.promises.lstat(previous)).isSymbolicLink()) {
        await moveBack(previous, linkPath);
        throw new Error(`${linkPath} is not a symlink, so it won't be replaced`);
    }

    try {
        // Fails with EEXIST rather than overwriting anything that is there.
        await fs.promises.symlink(source, linkPath);
        try {
            save();
        } catch (error) {
            await removeLink({ source, destination: linkPath });
            throw error;
        }
    } catch (error) {
        // If this fails too, its error says where the previous link was left.
        if (previous) await moveBack(previous, linkPath);
        throw error;
    }

    // `previous` is a symlink, so unlinking it never touches what it points to.
    if (previous) await fs.promises.unlink(previous);
}

/**
 * Removes the link at the record's destination, but only if it is still the link this extension created.
 * Returns false if there was nothing of ours to remove.
 */
export async function removeLink(record: LinkLocation) {
    if (!isOwnLink(getLinkStatus(record))) return false;

    // Something else could take the link's place between the check above and the unlink. So move the entry aside
    // and check it again there, and put it back if it isn't ours.
    const aside = await moveAside(record.destination);
    if (!aside) return false;
    if (!isOwnLink(getLinkStatus({ source: record.source, destination: aside }))) {
        await moveBack(aside, record.destination);
        return false;
    }
    await fs.promises.unlink(aside);
    return true;
}
