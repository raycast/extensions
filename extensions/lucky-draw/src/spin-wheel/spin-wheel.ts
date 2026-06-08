export type SpinDecisionWheelOptions = {
  items: string[] | string;
};

export type SpinWheelPhase = "result" | "spinning";

type FormatSpinWheelMarkdownOptions = {
  activeIndex: number;
  items: string[];
  phase: SpinWheelPhase;
  progress: number;
};

const PROGRESS_BAR_SEGMENTS = 16;
const SPIN_STATUS_LINES = [
  "Stirring the odds...",
  "Letting randomness take the wheel...",
  "Sweeping past every contender...",
  "Closing in on the final call...",
] as const;

export default function spinDecisionWheel({ items }: SpinDecisionWheelOptions): string {
  if (typeof items === "string") {
    return spinDecisionWheel({ items: items.split(",").map((item) => item.trim()) });
  }

  return items[pickSpinWinnerIndex(items)]!;
}

export function pickSpinWinnerIndex(items: string[]): number {
  return Math.floor(Math.random() * items.length);
}

export function sanitizeSpinWheelItem(value: string): string {
  return value.trim();
}

export function removeSpinWheelItemAtIndex(items: string[], indexToRemove: number): string[] {
  return items.filter((_, index) => index !== indexToRemove);
}

export function buildSpinFrameOrder(itemCount: number, winnerIndex: number): number[] {
  if (itemCount <= 0) {
    return [];
  }

  const minimumRotations = itemCount === 1 ? 8 : itemCount * 4;
  const totalSteps = minimumRotations + winnerIndex;

  return Array.from({ length: totalSteps + 1 }, (_, step) => step % itemCount);
}

export function formatSpinWheelMarkdown({
  activeIndex,
  items,
  phase,
  progress,
}: FormatSpinWheelMarkdownOptions): string {
  const safeProgress = Math.max(0, Math.min(progress, 1));
  const headline = phase === "spinning" ? "# Spin Decision Wheel" : "# Winner Locked In";
  const activeItem = items[activeIndex] ?? "Unknown option";
  const odds = items.length > 0 ? `1 in ${items.length}` : "n/a";

  return [
    headline,
    "",
    `## ${phase === "spinning" ? "Spinning" : "Selected Option"}`,
    "",
    `**${escapeMarkdownInline(activeItem)}**`,
    "",
    `${buildProgressBar(safeProgress)} ${Math.round(safeProgress * 100)}%`,
    "",
    phase === "spinning"
      ? SPIN_STATUS_LINES[Math.min(Math.floor(safeProgress * SPIN_STATUS_LINES.length), SPIN_STATUS_LINES.length - 1)]
      : `Every option had a ${odds} shot before the wheel stopped.`,
    "",
    "### Wheel View",
    "",
    ...buildWheelOptionLines(items, activeIndex),
  ].join("\n");
}

function buildWheelOptionLines(items: string[], activeIndex: number): string[] {
  if (items.length === 0) {
    return ["- No options loaded"];
  }

  const orderedItems = items.map((_, index) => items[(activeIndex + index) % items.length]!);
  const visibleItems = orderedItems.slice(0, 6);
  const hiddenItemsCount = Math.max(orderedItems.length - visibleItems.length, 0);
  const wheelLines = visibleItems.map((item, index) => {
    if (index === 0) {
      return `- **> ${escapeMarkdownInline(item)}**`;
    }

    return `- ${escapeMarkdownInline(item)}`;
  });

  if (hiddenItemsCount > 0) {
    wheelLines.push(`- +${hiddenItemsCount} more option${hiddenItemsCount === 1 ? "" : "s"} in rotation`);
  }

  return wheelLines;
}

function buildProgressBar(progress: number): string {
  const filledSegments = Math.round(progress * PROGRESS_BAR_SEGMENTS);
  const emptySegments = PROGRESS_BAR_SEGMENTS - filledSegments;

  return `\`${"#".repeat(filledSegments)}${"-".repeat(emptySegments)}\``;
}

function escapeMarkdownInline(value: string): string {
  return value.replaceAll("\\", "\\\\").replace(/([`*_{}[\]()#+.!|-])/gu, "\\$1");
}
