import os from "node:os";
import path from "node:path";
import { sumMapValues } from "./utils.js";
const BOX_MIN_WIDTH = 76;
const BOX_MAX_WIDTH = 110;

export function longestStreak(days) {
  if (days.size === 0) {
    return 0;
  }

  const timestamps = [...days].sort().map((day) => Date.parse(`${day}T00:00:00`));
  let longest = 1;
  let current = 1;

  for (let index = 1; index < timestamps.length; index += 1) {
    const diffDays = Math.round((timestamps[index] - timestamps[index - 1]) / 86_400_000);
    if (diffDays === 1) {
      current += 1;
    } else {
      current = 1;
    }
    longest = Math.max(longest, current);
  }

  return longest;
}

export function fmtInt(value) {
  return Intl.NumberFormat("en-US").format(value);
}

export function fmtCompact(value) {
  const number = Number(value) || 0;
  if (number >= 1_000_000_000) {
    return `${(number / 1_000_000_000).toFixed(number >= 10_000_000_000 ? 0 : 1)}B`;
  }
  if (number >= 1_000_000) {
    return `${(number / 1_000_000).toFixed(number >= 10_000_000 ? 0 : 1)}M`;
  }
  if (number >= 1_000) {
    return `${(number / 1_000).toFixed(number >= 10_000 ? 0 : 1)}K`;
  }
  return fmtInt(number);
}

export function fmtUSD(value) {
  const number = Number(value) || 0;
  return `$${number.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function shortPath(value) {
  if (!value || value === "(unknown)") {
    return value ?? "(unknown)";
  }

  const home = os.homedir();
  return value === home || value.startsWith(`${home}${path.sep}`)
    ? `~${value.slice(home.length)}`
    : value;
}

export function truncate(value, width) {
  const text = String(value);
  if (text.length <= width) {
    return text;
  }

  if (width <= 3) {
    return text.slice(0, width);
  }

  return `${text.slice(0, width - 3)}...`;
}

export function truncateMiddle(value, width) {
  const text = String(value);
  if (text.length <= width) {
    return text;
  }

  if (width <= 3) {
    return text.slice(0, width);
  }

  const head = Math.ceil((width - 3) / 2);
  const tail = Math.floor((width - 3) / 2);
  return `${text.slice(0, head)}...${text.slice(text.length - tail)}`;
}

export function truncatePath(value, width) {
  const text = String(value);
  if (text.length <= width) {
    return text;
  }

  if (!text.includes("/")) {
    return truncateMiddle(text, width);
  }

  const parts = text.split("/");
  const last = parts.at(-1) || "";
  const collapsed = `~/.../${last}`;
  if (collapsed.length <= width) {
    return collapsed;
  }

  return `...${last.slice(Math.max(last.length - width + 3, 0))}`;
}

export function terminalWidth() {
  return Math.min(Math.max(process.stdout.columns ?? 88, BOX_MIN_WIDTH), BOX_MAX_WIDTH);
}

export function boxedLine(content, innerWidth) {
  return `│ ${truncate(content, innerWidth).padEnd(innerWidth)} │`;
}

export function boxedBlank(innerWidth) {
  return boxedLine("", innerWidth);
}

export function boxedTitle(title, innerWidth) {
  const text = `─ ${title} `;
  return `┌${text}${"─".repeat(Math.max(innerWidth + 2 - text.length, 0))}┐`;
}

export function boxedFooter(innerWidth) {
  return `└${"─".repeat(innerWidth + 2)}┘`;
}

export function infoLine(labelText, value, innerWidth) {
  const labelWidth = 12;
  const valueWidth = innerWidth - labelWidth;
  return boxedLine(`${labelText.padEnd(labelWidth)}${truncate(value, valueWidth)}`, innerWidth);
}

export function bar(value, total, width = 16) {
  if (total <= 0 || value <= 0) {
    return "░".repeat(width);
  }

  const filled = Math.max(1, Math.round((value / total) * width));
  return `${"█".repeat(Math.min(filled, width))}${"░".repeat(Math.max(width - filled, 0))}`;
}

export function topLine(name, count, total, unit, innerWidth) {
  const barWidth = 16;
  const percentWidth = 4;
  const countWidth = 16;
  const availableNameWidth = innerWidth - 2 - 1 - countWidth - 2 - barWidth - 1 - percentWidth;
  const nameWidth = Math.max(24, availableNameWidth);
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  const displayName = name.includes("/") ? truncatePath(name, nameWidth) : truncateMiddle(name, nameWidth);
  const left = `  ${displayName.padEnd(nameWidth)}`;
  const middle = `${fmtInt(count)} ${unit}`.padStart(countWidth);
  const right = `${bar(count, total, barWidth)} ${`${percent}%`.padStart(percentWidth)}`;
  return boxedLine(`${left} ${middle}  ${right}`, innerWidth);
}

export function sortedEntries(map) {
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

// Entries arrive in display order; the remainder always stays after the top rows.
export function withOther(entries, limit, summarize = (values) => values.reduce((sum, value) => sum + value, 0)) {
  const visible = entries.slice(0, limit);
  const remainder = entries.slice(limit);
  if (remainder.length > 0) {
    visible.push([`Other (${remainder.length})`, summarize(remainder.map(([, value]) => value))]);
  }
  return visible;
}

export function topSection(lines, title, map, limit, unit, innerWidth) {
  const entries = sortedEntries(map);
  lines.push(boxedLine(title, innerWidth));
  if (entries.length === 0) {
    lines.push(boxedLine("  none", innerWidth));
    return;
  }

  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  for (const [name, count] of withOther(entries, limit)) {
    lines.push(topLine(shortPath(name), count, total, unit, innerWidth));
  }
}
