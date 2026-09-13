import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * The machines `rcc fleet` is configured to reach.
 *
 * Read from the file, never by asking rcc. Every `fleet` subcommand that would
 * list them also opens SSH connections to them, and a screen has to be able to
 * show what is configured without touching anything: opening a view is not
 * consent to connect to a dozen machines.
 */

export const FLEET_CONF = join(homedir(), ".raccoon", "fleet.conf");
export const FLEET_GROUPS = join(homedir(), ".raccoon", "fleet-groups.conf");

export type Host = {
	/** Hostname or address, without the port. */
	name: string;
	/** The port, when the line named one. */
	port?: string;
	/** The audit profile this host is pinned to, when the line named one. */
	profile?: string;
	/** The line as written, for anyone who needs the original. */
	line: string;
};

/**
 * One line of fleet.conf: `host[:port] [--profile NAME]`, `#` starts a comment.
 *
 * An IPv6 address carries colons of its own, and rcc has already shipped the
 * bug where `fe80::1` read as host `fe80:` on port 1 — fleet.sh carries a
 * comment about it. So a port is only taken when there is exactly one colon
 * and digits follow it; the bracketed `[fe80::1]:22` form is read properly.
 */
export function parseHostLine(raw: string): Host | undefined {
	const line = raw.split("#")[0].trim();
	if (line === "") return undefined;

	const [hostport, ...rest] = line.split(/\s+/);
	const profile = /--profile\s+(\S+)/.exec(rest.join(" "))?.[1];

	const bracketed = /^\[([^\]]+)\](?::(\d+))?$/.exec(hostport);
	if (bracketed) {
		return { name: bracketed[1], port: bracketed[2], profile, line };
	}

	const colons = (hostport.match(/:/g) ?? []).length;
	if (colons === 1) {
		const [name, port] = hostport.split(":");
		if (/^\d+$/.test(port) && name !== "") {
			return { name, port, profile, line };
		}
	}
	return { name: hostport, profile, line };
}

/** Every host in the file, or an empty list when there is no file. */
export async function readHosts(path: string = FLEET_CONF): Promise<Host[]> {
	let contents: string;
	try {
		contents = await readFile(path, "utf8");
	} catch (error) {
		// No fleet configured. The ordinary case, not a failure.
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
		throw error;
	}
	return contents
		.split("\n")
		.map(parseHostLine)
		.filter((host): host is Host => host !== undefined);
}

/** `name host1 host2 ...`, one group per line. */
export async function readGroups(
	path: string = FLEET_GROUPS,
): Promise<Map<string, string[]>> {
	let contents: string;
	try {
		contents = await readFile(path, "utf8");
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT")
			return new Map();
		throw error;
	}
	const groups = new Map<string, string[]>();
	for (const raw of contents.split("\n")) {
		const line = raw.split("#")[0].trim();
		if (line === "") continue;
		const [name, ...members] = line.split(/\s+/);
		if (name && members.length > 0) groups.set(name, members);
	}
	return groups;
}
