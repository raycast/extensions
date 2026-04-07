import type { Translations } from "../i18n/translations";
import type { StatusInfo, StatusKind } from "./status";

const BAR_WIDTH = 60;

const STATUS_EMOJI: Record<StatusKind, string> = {
  ahead: "🟢",
  behind: "🔴",
  neutral: "🟡",
  idle: "⚪",
};

const MOOD_EMOJI: Record<StatusKind, string> = {
  ahead: "🧠",
  behind: "🤖",
  neutral: "😇",
  idle: "😶",
};

function makeBar(pct: number, fillChar = "█"): string {
  const filled = Math.round((pct / 100) * BAR_WIDTH);
  return fillChar.repeat(filled) + "░".repeat(BAR_WIDTH - filled);
}

export function buildMarkdown(
  usage: number,
  monthPct: number,
  elapsed: number,
  total: number,
  status: StatusInfo,
  holidaysLoading: boolean,
  t: Translations,
): string {
  const emoji = STATUS_EMOJI[status.kind];
  const mood = MOOD_EMOJI[status.kind];

  const titleMap: Record<StatusKind, string> = {
    ahead: t.statusAhead,
    behind: t.statusBehind,
    neutral: t.statusNeutral,
    idle: t.statusIdle,
  };

  const deltaStr =
    status.kind === "idle" || status.delta === 0
      ? t.metaDeltaOnTrack
      : status.delta > 0
        ? t.metaDeltaBehind(status.delta)
        : t.metaDeltaAhead(Math.abs(status.delta));

  const usageFill = status.kind === "ahead" ? "▓" : "█";

  const lines: string[] = [`# ${emoji} ${titleMap[status.kind]} ${mood}`, ""];

  // Requests remaining for today — headline metric
  if (status.kind !== "idle" && status.daysLeft > 0) {
    lines.push(`⚡ **~${status.requestsToday}** ${t.metaRequestsToday}`, "", "---", "");
  }

  // Month bar: label line, then bar line
  lines.push(
    `📅 **${t.metaMonthDone} ${monthPct}%** · *${elapsed} / ${total}*\n`,
    `\`${makeBar(monthPct)}\` **${monthPct}%**`,
  );

  // Usage bar: only when user has entered a value
  if (usage > 0) {
    lines.push(
      "",
      `${emoji} **${t.metaYouUsed} ${usage}%** · *${deltaStr}* ${mood}\n`,
      `\`${makeBar(usage, usageFill)}\` **${usage}%**`,
    );
  }

  lines.push("", "---", "", `${status.message}`);

  if (holidaysLoading) {
    lines.push("", "---", "", t.mdFetchingHolidays);
  }

  return lines.join("\n");
}
