import type { ReactElement } from "react";
import Audit from "./audit";
import Upgrade from "./upgrade";
import Apps from "./apps";
import AuditHistory from "./audit-history";
import AuditWatch from "./audit-watch";
import Fleet from "./fleet";
import Battery from "./battery";
import Memory from "./memory";
import Backup from "./backup";
import Certs from "./certs";
import Git from "./git";
import Ssh from "./ssh";
import Startup from "./startup";
import Disk from "./disk";
import Docker from "./docker";
import Env from "./env";
import Fonts from "./fonts";
import History from "./history";
import Network from "./network";
import Overlap from "./overlap";
import Ports from "./ports";
import Trash from "./trash";
import Wifi from "./wifi";
import Xcode from "./xcode";
import type { RccCommand } from "./commands";
import { RccDetail } from "./rcc-detail";

/**
 * The purpose-built screen for a command, where one exists.
 *
 * Without this the launcher opened every command with RccDetail, so the four
 * rewritten views were reachable only as their own Raycast commands and
 * choosing Battery from the list still showed rcc's table. One index, so a new
 * view is wired in one place.
 */
const VIEWS: Record<string, () => ReactElement> = {
	upgrade: Upgrade,
	apps: Apps,
	audit: Audit,
	"audit-deep": () => <Audit deep />,
	"audit-fix": () => <Audit deep />,
	"audit-history": AuditHistory,
	"audit-watch": AuditWatch,
	fleet: Fleet,
	battery: Battery,
	memory: Memory,
	ports: Ports,
	trash: Trash,
	wifi: Wifi,
	overlap: Overlap,
	docker: Docker,
	history: History,
	certs: Certs,
	startup: Startup,
	fonts: Fonts,
	env: Env,
	disk: Disk,
	network: Network,
	xcode: Xcode,
	backup: Backup,
	git: Git,
	ssh: Ssh,
};

/**
 * Commands the launcher does not offer, because in a screen they are not
 * distinct commands at all.
 *
 * `audit quiet` is `--deep --quiet`, and `audit json` is `--deep --json`:
 * both are ways of printing to a terminal, not ways of looking. Rendered they
 * are the same screen as `audit deep`, so listing them offers a reader three
 * rows that do one thing. The JSON is still reachable — as an action on the
 * audit screen, where it is a thing you take away rather than a thing you read.
 */
const HIDDEN = new Set(["audit-quiet", "audit-json"]);

/** The key a command is registered under: `audit deep` -> `audit-deep`. */
export function viewKey(command: RccCommand): string {
	return command.args.join("-");
}

/** Whether the launcher lists this command at all. */
export function isHidden(command: RccCommand): boolean {
	return HIDDEN.has(viewKey(command));
}

/** Whether this command has a screen of its own rather than raw output. */
export function hasView(command: RccCommand): boolean {
	return viewKey(command) in VIEWS;
}

export function viewFor(command: RccCommand): ReactElement {
	if (hasView(command)) {
		const View = VIEWS[viewKey(command)];
		return <View />;
	}
	return <RccDetail command={command} />;
}
