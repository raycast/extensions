import { contentText } from "./content-text";
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
): string {
  const emoji = STATUS_EMOJI[status.kind];
  const mood = MOOD_EMOJI[status.kind];

  const titleMap: Record<StatusKind, string> = {
    ahead: contentText.statusAhead,
    behind: contentText.statusBehind,
    neutral: contentText.statusNeutral,
    idle: contentText.statusIdle,
  };

  const deltaStr =
    status.kind === "idle" || status.delta === 0
      ? contentText.metaDeltaOnTrack
      : status.delta > 0
        ? contentText.metaDeltaBehind(status.delta)
        : contentText.metaDeltaAhead(Math.abs(status.delta));

  const usageFill = status.kind === "ahead" ? "▓" : "█";

  const lines: string[] = [`# ${emoji} ${titleMap[status.kind]} ${mood}`, ""];

  // Requests remaining for today — headline metric
  if (status.kind !== "idle" && status.daysLeft > 0) {
    lines.push(`⚡ **~${status.requestsToday}** ${contentText.metaRequestsToday}`, "", "---", "");
  }

  // Month bar: label line, then bar line
  lines.push(
    `📅 **${contentText.metaMonthDone} ${monthPct}%** · *${elapsed} / ${total}*\n`,
    `\`${makeBar(monthPct)}\` **${monthPct}%**`,
  );

  // Usage bar: only when user has entered a value
  if (usage > 0) {
    lines.push(
      "",
      `${emoji} **${contentText.metaYouUsed} ${usage}%** · *${deltaStr}* ${mood}\n`,
      `\`${makeBar(usage, usageFill)}\` **${usage}%**`,
    );
  }

  lines.push("", "---", "", `${status.message}`);

  if (holidaysLoading) {
    lines.push("", "---", "", contentText.mdFetchingHolidays);
  }

  return lines.join("\n");
}
