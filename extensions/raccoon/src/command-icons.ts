import { Icon } from "@raycast/api";

/**
 * An icon per command, for the list that offers all of them.
 *
 * `commands.ts` is generated from `rcc --help` and carries no icons, so that
 * list drew one of two: a window for a command with a view, a page of text for
 * the rest. Twenty-eight rows, two glyphs — nothing separated `disk` from
 * `battery` at a glance, which is the one job an icon in a searchable list has.
 *
 * This map lives outside the generated file so regenerating the command list
 * cannot wipe it. A command it does not name still renders, with the fallback.
 *
 * Where two commands share an icon they share a meaning: `xcode` and
 * `audit fix` are both the hammer because both change something rather than
 * report it, and the `audit` family differs by what it does with the report,
 * not by what it looks at.
 */
const ICONS: Record<string, Icon> = {
	upgrade: Icon.Download,
	apps: Icon.AppWindowGrid3x3,

	audit: Icon.Shield,
	"audit-deep": Icon.Binoculars,
	"audit-quiet": Icon.SpeakerOff,
	"audit-fix": Icon.Hammer,
	"audit-json": Icon.Code,
	"audit-history": Icon.Clock,
	"audit-watch": Icon.Alarm,

	network: Icon.Network,
	wifi: Icon.Wifi,
	ports: Icon.Plug,
	certs: Icon.Lock,
	ssh: Icon.Key,
	fleet: Icon.Monitor,

	disk: Icon.HardDrive,
	memory: Icon.MemoryChip,
	battery: Icon.Battery,
	trash: Icon.Trash,
	backup: Icon.ArrowCounterClockwise,
	startup: Icon.Rocket,
	fonts: Icon.Text,

	git: Icon.CodeBlock,
	docker: Icon.Box,
	xcode: Icon.Hammer,
	env: Icon.Terminal,
	overlap: Icon.Layers,
	history: Icon.Clock,
};

/** The fallback: a command this map has not been told about still gets a row. */
const UNKNOWN = Icon.Dot;

export function iconFor(id: string): Icon {
	return ICONS[id] ?? UNKNOWN;
}

/** Every id this map names, so a test can hold it against the generated list. */
export const ICON_IDS = Object.keys(ICONS);
