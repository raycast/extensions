/**
 * rcc prints two output styles: Markdown tables (battery, ports, memory) and
 * ASCII boxes drawn with `+---+` borders (audit). Tables are already Markdown;
 * boxes only line up in a monospace block, so they get fenced.
 */

const BOXISH = /^[|+]/;
const BOX_BORDER = /^\+[-+]+\+\s*$/;

/**
 * A prompt rcc printed for a terminal that Raycast cannot answer: stdin is
 * closed, so the read already fell through to the default. Showing it would
 * invite the user to press a key that goes nowhere.
 */
const DEAD_PROMPT = /\[y\/N\]\s*$/;

/** "Fix 8 issue(s) automatically? [y/N]" -> 8 */
const PENDING_FIXES = /Fix (\d+) issue\(s\) automatically\?/;

/**
 * rcc's own progress protocol: `__RCC_PROGRESS__:<done>:<total>:<what>`.
 *
 * `upgrade` and `apps` are actions, not reports. On a terminal they redraw a
 * bar in place; with stdout on a pipe they print one of these lines per step
 * instead, for whoever is driving them to render. Nothing on this side read
 * them, so a reader watching `rcc upgrade` got thirty lines of protocol.
 *
 * The info field is the rest of the line, colons and all: "pip: checking
 * outdated..." has to survive whole.
 */
const PROGRESS = /^__RCC_PROGRESS__:(\d+):(\d+):(.*)$/;

export type Progress = { current: number; total: number; info: string };

/** The last step rcc reported, or nothing if this command reports no progress. */
export function progressOf(output: string): Progress | undefined {
	let last: Progress | undefined;
	for (const line of output.split("\n")) {
		const match = PROGRESS.exec(line);
		if (match) {
			last = {
				current: Number(match[1]),
				total: Number(match[2]),
				info: match[3],
			};
		}
	}
	return last;
}

/**
 * The output with rcc's progress protocol taken out, still plain text.
 *
 * `toMarkdown` drops these lines on its way to a rendered view, but the view is
 * not the only place the output goes: Copy Output hands it to the clipboard,
 * and copying thirty lines of `__RCC_PROGRESS__` into a bug report or a message
 * is how the markers reached a reader who had already been shown a clean view.
 */
export function withoutProgress(output: string): string {
	return output
		.split("\n")
		.filter((line) => !PROGRESS.test(line))
		.join("\n");
}

const BAR_WIDTH = 20;

/** That step as a line a Detail can show while the command is still running. */
export function progressBar({ current, total, info }: Progress): string {
	const filled =
		total > 0
			? Math.min(BAR_WIDTH, Math.round((current / total) * BAR_WIDTH))
			: 0;
	const bar = "█".repeat(filled) + "░".repeat(BAR_WIDTH - filled);
	return `\`${bar}\`  **${current}/${total}**${info ? ` · ${info}` : ""}`;
}

/** Contiguous runs of box characters that actually contain a `+---+` border. */
function boxRanges(lines: string[]): Array<[number, number]> {
	const ranges: Array<[number, number]> = [];
	let index = 0;
	while (index < lines.length) {
		if (!BOXISH.test(lines[index])) {
			index += 1;
			continue;
		}
		let end = index;
		while (end < lines.length && BOXISH.test(lines[end])) end += 1;
		if (lines.slice(index, end).some((line) => BOX_BORDER.test(line)))
			ranges.push([index, end]);
		index = end;
	}
	return ranges;
}

/**
 * Turn rcc output into Markdown a Raycast <Detail> renders faithfully:
 * section headers become h2, ASCII boxes are fenced, and every other non-empty
 * line gets a hard break so status lines do not collapse into one paragraph.
 */
export function toMarkdown(output: string): string {
	const lines = output
		.split("\n")
		.filter((line) => !DEAD_PROMPT.test(line) && !PROGRESS.test(line));
	const inBox = new Array<boolean>(lines.length).fill(false);
	const opens = new Set<number>();
	const closes = new Set<number>();

	for (const [start, end] of boxRanges(lines)) {
		opens.add(start);
		closes.add(end);
		for (let i = start; i < end; i += 1) inBox[i] = true;
	}

	const rendered: string[] = [];
	lines.forEach((line, index) => {
		if (opens.has(index)) rendered.push("```");
		if (inBox[index]) {
			rendered.push(line);
		} else {
			const withHeader = line.replace(/^-- (.+)$/, "## $1");
			rendered.push(withHeader.trim() === "" ? "" : `${withHeader}  `);
		}
		if (closes.has(index + 1)) rendered.push("```");
	});

	return rendered.join("\n");
}

/** How many fixes rcc offered to apply, if any. */
export function pendingFixCount(output: string): number {
	const match = PENDING_FIXES.exec(output);
	return match ? Number(match[1]) : 0;
}

/**
 * Raccoon runs unprivileged by default so that no command can raise a Touch ID
 * dialog the user did not ask for. When a report says checks were skipped, point
 * at the action that re-runs it with root rather than leaving a bare warning.
 */
const SUDO_UNAVAILABLE = /sudo unavailable|requires sudo/i;

export const SUDO_HINT = [
	"",
	"---",
	"",
	"> **Some checks were skipped because Raccoon ran without administrator rights.**",
	"> Values shown without root can be wrong, not just missing.",
	">",
	"> rcc asks for Touch ID itself when a check needs root. If it did not, run the",
	"> **Configure Admin Session** command once, then **Run Again** from here.",
].join("\n");

export function withSudoHint(markdown: string): string {
	return SUDO_UNAVAILABLE.test(markdown)
		? `${markdown}\n${SUDO_HINT}`
		: markdown;
}
