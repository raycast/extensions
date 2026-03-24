import { Toast } from "@raycast/api";
import { PromptPhase } from "./promptEvents";

export type PendingPhase = PromptPhase | "thinking";
const INLINE_COMMAND_GRACE_SECONDS = 2;

export function createPendingProgress(
  onTick: (elapsedSeconds: number) => void,
): {
  getElapsedSeconds: () => number;
  stop: () => void;
} {
  const startedAt = Date.now();
  const intervalId = setInterval(() => {
    onTick(getElapsedSeconds(startedAt));
  }, 1000);

  return {
    getElapsedSeconds: () => getElapsedSeconds(startedAt),
    stop: () => clearInterval(intervalId),
  };
}

export function getInitialPendingPhase(aiProvider?: string): PendingPhase {
  return aiProvider === "raycast" ? "generating" : "connecting";
}

export function renderInlinePendingState({
  toast,
  elapsedSeconds,
  phase,
  reasoning,
  commandTitle,
  aiProvider,
}: {
  toast: Toast;
  elapsedSeconds: number;
  phase: PendingPhase;
  reasoning: string;
  commandTitle: string;
  aiProvider?: string;
}) {
  toast.title = formatInlinePendingTitle({
    aiProvider,
    commandTitle,
    elapsedSeconds,
    phase,
  });
  toast.message =
    phase === "thinking" && reasoning
      ? formatThinkingToastMessage(reasoning)
      : "";
}

export function renderPanelPendingState({
  elapsedSeconds,
  onResultChange,
  phase,
  reasoning,
  usesStaticWaitingPlaceholder,
}: {
  elapsedSeconds: number;
  onResultChange?: (result: string | null) => void;
  phase: PendingPhase;
  reasoning: string;
  usesStaticWaitingPlaceholder: boolean;
}) {
  if (usesStaticWaitingPlaceholder && phase !== "thinking") {
    onResultChange?.(formatNonStreamingWaitingMarkdown());
    return;
  }

  if (phase === "connecting" || phase === "generating") {
    onResultChange?.(null);
    return;
  }

  onResultChange?.(
    formatPendingMarkdown({
      phase,
      elapsedSeconds,
      reasoning,
    }),
  );
}

export function formatPendingTitle(
  phase: PendingPhase,
  elapsedSeconds: number,
): string {
  switch (phase) {
    case "connecting":
      return `Connecting... ${elapsedSeconds}s`;
    case "generating":
      return `Generating... ${elapsedSeconds}s`;
    case "thinking":
      return `Thinking... ${elapsedSeconds}s`;
  }
}

function formatInlinePendingTitle({
  aiProvider,
  commandTitle,
  elapsedSeconds,
  phase,
}: {
  aiProvider?: string;
  commandTitle: string;
  elapsedSeconds: number;
  phase: PendingPhase;
}): string {
  if (phase === "thinking") {
    return formatPendingTitle(phase, elapsedSeconds);
  }

  if (aiProvider === "raycast") {
    return elapsedSeconds <= INLINE_COMMAND_GRACE_SECONDS
      ? `${commandTitle}...`
      : `Preparing result... ${elapsedSeconds}s`;
  }

  if (phase === "generating") {
    return `${commandTitle}...`;
  }

  if (
    phase === "connecting" &&
    elapsedSeconds <= INLINE_COMMAND_GRACE_SECONDS
  ) {
    return `${commandTitle}...`;
  }

  return formatPendingTitle(phase, elapsedSeconds);
}

function getElapsedSeconds(startedAt: number): number {
  return Math.max(1, Math.ceil((Date.now() - startedAt) / 1000));
}

function formatThinkingToastMessage(reasoning: string): string {
  const flatText = reasoning.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
  const displayLength = 50;
  const codePoints = [...flatText];

  if (codePoints.length <= displayLength) {
    return flatText;
  }

  return codePoints.slice(-displayLength).join("");
}

function formatPendingMarkdown({
  phase,
  elapsedSeconds,
  reasoning,
}: {
  phase: PendingPhase;
  elapsedSeconds: number;
  reasoning: string;
}): string {
  const title = formatPendingTitle(phase, elapsedSeconds);
  const body =
    phase === "thinking" && reasoning.trim().length > 0
      ? `${title}\n\n${reasoning.trim()}`
      : title;

  return body
    .split("\n")
    .map((line) => (line.length > 0 ? `> ${line}` : ">"))
    .join("\n");
}

function formatNonStreamingWaitingMarkdown(): string {
  return [
    "> Preparing your result...",
    ">",
    "> Raycast AI does not provide live output.",
  ].join("\n");
}
