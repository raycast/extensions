import { ITEMS, SKILL_BY_ID } from "./data";
import { activeBuff } from "./engine";
import { BuffKind, Bundle, GameState, ItemDef, ItemId, Report } from "./types";

/** An item's description, plus the Combat level it needs, taken from its data so the two cannot disagree. */
export function describeItem(item: ItemDef): string {
  if (!item.combatReq) return item.description;
  return `${item.description} Needs Combat ${item.combatReq} to ${item.slot === "weapon" ? "wield" : "wear"}.`;
}

export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  if (total < 60) return `${total}s`;
  const m = Math.floor(total / 60);
  if (m < 60) return `${m}m ${total % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function bar(fraction: number, width = 20): string {
  const filled = Math.round(Math.min(1, Math.max(0, fraction)) * width);
  return "▰".repeat(filled) + "▱".repeat(width - filled);
}

export function formatBundle(bundle: Bundle = {}): string {
  const parts = (Object.entries(bundle) as [ItemId, number][]).map(([id, n]) => `${n}× ${ITEMS[id].name}`);
  return parts.length ? parts.join(", ") : "nothing";
}

export function formatReport(r: Report): string {
  const parts: string[] = [];
  if (Object.keys(r.items).length) parts.push(`+${formatBundle(r.items)}`);
  if (Object.keys(r.rare).length) parts.push(`Rare find: ${formatBundle(r.rare)}`);
  for (const up of r.levelUps) parts.push(`${SKILL_BY_ID[up.skill].name} level ${up.level}!`);
  for (const b of r.bounties)
    parts.push(`Bounty for ${b.poster} done: +${b.marks} Marks${b.level ? `, Bounty level ${b.level}!` : ""}`);
  parts.push(...r.notices);
  if (r.completed) parts.push(r.completed);
  if (r.stoppedReason) parts.push(r.stoppedReason);
  return parts.join(" · ");
}

export const formatCredits = (n: number) => `${Math.floor(n).toLocaleString("en-US")} cr`;

export const formatMarks = (n: number) => `${Math.floor(n).toLocaleString("en-US")} Marks`;

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** "per hour" figures read better rounded: 1,240, 12.5, 0.4. */
export function formatRate(n: number): string {
  if (n >= 100) return Math.round(n).toLocaleString("en-US");
  if (n >= 10) return n.toFixed(0);
  return n.toFixed(1);
}

export function formatRates(bundle: Bundle = {}): string {
  const parts = (Object.entries(bundle) as [ItemId, number][]).map(([id, n]) => `${formatRate(n)} ${ITEMS[id].name}`);
  return parts.length ? parts.join(", ") : "nothing";
}

/** One line per running potion: "Swift Tonic, 12m 3s left". */
export function formatBuffs(s: GameState): string[] {
  return (Object.keys(s.buffs) as BuffKind[]).flatMap((kind) => {
    const buff = activeBuff(s, kind);
    return buff ? [`${ITEMS[buff.item].name}, ${formatDuration(buff.expiresAt - s.lastTick)} left`] : [];
  });
}
