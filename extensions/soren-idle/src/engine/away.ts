import { ITEMS, SKILL_BY_ID } from "./data";
import { formatBundle, formatDuration } from "./format";
import { emptyReport, isQuiet, mergeReports } from "./report";
import { GameState, ItemId, Report, SkillId } from "./types";

/** Folds a report into what has happened since the player last looked. */
export function recordAway(s: GameState, report: Report): GameState {
  if (isQuiet(report)) return s;
  return { ...s, unseen: mergeReports(s.unseen ?? emptyReport(), report) };
}

export const clearAway = (s: GameState): GameState => (s.unseen ? { ...s, unseen: null } : s);

const num = (n: number) => Math.round(n).toLocaleString("en-US");

/** One line per skill: how long it worked, and what that made. */
export function skillLines(r: Report): string[] {
  return (Object.entries(r.skills) as [SkillId, NonNullable<Report["skills"][SkillId]>][])
    .filter(([, part]) => part.cycles > 0 || part.ms > 0)
    .sort((a, b) => b[1].ms - a[1].ms)
    .map(([skill, part]) => {
      const made = formatBundle(part.items);
      return [
        `${SKILL_BY_ID[skill].name} ${formatDuration(part.ms)}`,
        `${num(part.cycles)} ${part.cycles === 1 ? "task" : "tasks"}`,
        `+${num(part.xp)} XP`,
        ...(made === "nothing" ? [] : [made]),
      ].join(" · ");
    });
}

/** The full away summary, one line each. Empty when nothing happened. */
export function awayLines(r: Report): string[] {
  const lines = skillLines(r);
  if (Object.keys(r.passive).length) lines.push(`Drones brought back ${formatBundle(r.passive)}`);
  if (Object.keys(r.rare).length) lines.push(`★ Rare finds: ${formatBundle(r.rare)}`);
  for (const up of r.levelUps) lines.push(`${SKILL_BY_ID[up.skill].name} reached level ${up.level}`);
  for (const b of r.bounties)
    lines.push(`Bounty for ${b.poster} done: +${b.marks} Marks${b.level ? `, Bounty level ${b.level}` : ""}`);
  lines.push(...r.notices);
  if (r.completed) lines.push(r.completed);
  if (r.stoppedReason) lines.push(`Stopped: ${r.stoppedReason}`);
  return lines;
}

/** Markdown for the Overview, with the same lines as the menu bar. */
export function awayMarkdown(r: Report, extra: string[] = []): string {
  const lines = [...awayLines(r), ...extra];
  return [
    `# While you were away`,
    `**${formatDuration(r.elapsedMs)}**`,
    "",
    ...(lines.length ? lines.map((l) => `- ${l}`) : ["Nothing happened."]),
  ].join("\n");
}

/** Gear and loot that is worth a name check in a single toast line. */
export const topItems = (r: Report, n = 3): string =>
  (Object.entries(r.items) as [ItemId, number][])
    .sort((a, b) => b[1] * ITEMS[b[0]].value - a[1] * ITEMS[a[0]].value)
    .slice(0, n)
    .map(([id, c]) => `${num(c)}× ${ITEMS[id].name}`)
    .join(", ");
