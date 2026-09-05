import { FastNavCommand } from "./bridge";
import { UsageMap, usageBonus, usageKey } from "./usage";

export interface RankedCommand {
  command: FastNavCommand;
  score: number;
}

const maximumEmptyQueryUsageBonus = 35;
const maximumSearchUsageBonus = 25;
const minimumFocusedApplicationEmptyBonus = maximumEmptyQueryUsageBonus + 5;
const minimumFocusedApplicationSearchBonus = maximumSearchUsageBonus + 5;

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .replaceAll("…", "");
}

function fuzzyScore(needle: string, haystack: string): number | undefined {
  if (!needle) return 0;
  const queryCharacters = [...needle];
  const candidateCharacters = [...haystack];
  if (queryCharacters.length > candidateCharacters.length) return undefined;

  let queryIndex = 0;
  let previousMatch = -2;
  let score = 0;

  for (
    let candidateIndex = 0;
    candidateIndex < candidateCharacters.length;
    candidateIndex += 1
  ) {
    if (queryIndex >= queryCharacters.length) break;
    if (candidateCharacters[candidateIndex] !== queryCharacters[queryIndex])
      continue;

    const isConsecutive = candidateIndex === previousMatch + 1;
    const previousCharacter =
      candidateIndex === 0 ? "" : candidateCharacters[candidateIndex - 1];
    const isWordStart =
      candidateIndex === 0 || /[\s\-_/.:>]/u.test(previousCharacter);

    score += 12;
    if (isConsecutive) score += 18;
    if (isWordStart) score += 14;
    if (previousMatch >= 0)
      score -= Math.max(0, candidateIndex - previousMatch - 1) * 1.25;

    previousMatch = candidateIndex;
    queryIndex += 1;
  }

  if (queryIndex !== queryCharacters.length) return undefined;
  return score - (candidateCharacters.length - queryCharacters.length) * 0.08;
}

function matchScore(
  query: string,
  command: FastNavCommand,
): number | undefined {
  const normalizedQuery = normalize(query).trim();
  if (!normalizedQuery) return 0;

  const normalizedTitle = normalize(command.title);
  const normalizedPath = normalize(command.menuPath.join(" › "));
  const normalizedShortcut = normalize(command.shortcut ?? "");
  const tokens = normalizedQuery.split(/\s+/u);
  let total = 0;

  for (const token of tokens) {
    const scores = [
      fuzzyScore(token, normalizedTitle),
      fuzzyScore(token, normalizedPath),
      fuzzyScore(token, normalizedShortcut),
    ]
      .map((score, index) =>
        score === undefined ? undefined : score + [45, 10, 20][index],
      )
      .filter((score): score is number => score !== undefined);

    if (!scores.length) return undefined;
    total += Math.max(...scores);
  }

  if (normalizedTitle === normalizedQuery) total += 150;
  else if (normalizedTitle.startsWith(normalizedQuery)) total += 80;
  else if (normalizedTitle.includes(normalizedQuery)) total += 35;

  return total;
}

function focusedApplicationBonus(
  command: FastNavCommand,
  hasQuery: boolean,
  focusedApplicationPID?: number,
): number {
  if (command.pid !== focusedApplicationPID) return 0;

  const rootMenu = command.menuPath[0]?.toLocaleLowerCase();
  const isAppleSystemMenu =
    command.source === "menu" && (rootMenu === "apple" || rootMenu === "");
  if (isAppleSystemMenu) return 0;

  const bridgeBonus = hasQuery
    ? command.focusedApplicationBonusSearch
    : command.focusedApplicationBonusEmpty;
  const minimumBonus = hasQuery
    ? minimumFocusedApplicationSearchBonus
    : minimumFocusedApplicationEmptyBonus;

  // Older bridge builds used a search bonus that was weaker than one recent
  // usage entry. Keep the live app ahead for equally relevant commands while
  // still allowing a substantially better fuzzy match from another app to win.
  return Math.max(bridgeBonus ?? 0, minimumBonus);
}

export function rankCommands(
  commands: FastNavCommand[],
  query: string,
  usage: UsageMap,
  focusedApplicationPID?: number,
): RankedCommand[] {
  const hasQuery = query.trim().length > 0;

  return commands
    .flatMap((command) => {
      const fuzzy = matchScore(query, command);
      if (fuzzy === undefined) return [];

      const enabledBonus = command.isEnabled ? 3 : -30;
      const rawUsageBonus = usageBonus(usage[usageKey(command)]);
      const adjustedUsageBonus = hasQuery
        ? Math.min(maximumSearchUsageBonus, rawUsageBonus * 0.2)
        : Math.min(maximumEmptyQueryUsageBonus, rawUsageBonus);
      const focusBonus = focusedApplicationBonus(
        command,
        hasQuery,
        focusedApplicationPID,
      );
      return [
        {
          command,
          score: fuzzy + enabledBonus + adjustedUsageBonus + focusBonus,
        },
      ];
    })
    .sort(
      (lhs, rhs) =>
        rhs.score - lhs.score || lhs.command.order - rhs.command.order,
    );
}
