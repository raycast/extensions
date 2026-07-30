import type { CheatsheetItem, StatusBadge } from "../types";

const STATUS_ORDER: StatusBadge[] = ["CAUTION", "PERSISTS", "SESSION", "RESTART", "DEPRECATED", "NEW"];

export function getEffectiveStatuses(item: CheatsheetItem, command?: string): StatusBadge[] {
  const statuses = new Set(item.statuses ?? []);
  const effectiveCommand = command ?? item.usage;

  if (item.warning) statuses.add("CAUTION");
  if (item.id === "command-model") {
    statuses.delete("SESSION");
    statuses.delete("PERSISTS");

    if (effectiveCommand === "/model --refresh") {
      statuses.delete("CAUTION");
    } else if (effectiveCommand.includes("--global")) {
      statuses.add("PERSISTS");
    } else if (effectiveCommand.includes("--session")) {
      statuses.add("SESSION");
    }
  }
  if (item.id === "command-fast") {
    statuses.delete("SESSION");
    statuses.delete("PERSISTS");
    if (effectiveCommand.includes("--global") && !effectiveCommand.includes("[--global]")) {
      statuses.add("PERSISTS");
    } else if (/(?:^|\s)(?:fast|normal)(?:\s|$)/.test(effectiveCommand)) {
      statuses.add("SESSION");
    }
  }

  return STATUS_ORDER.filter((status) => statuses.has(status));
}
