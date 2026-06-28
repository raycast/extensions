export type PlaybackModeInput = {
  isGateway: boolean;
  hasCustomPath: boolean;
  saveAudioFiles: boolean;
  speed: number;
  ffplayAvailable: boolean;
};

export type PlaybackModePrerequisitesInput = Omit<PlaybackModeInput, "ffplayAvailable">;

export type PlaybackModeResult = {
  mode: "stream" | "buffered";
  warnings: string[];
};

export function shouldProbeFfplay(input: PlaybackModePrerequisitesInput): boolean {
  return input.isGateway && !input.hasCustomPath && !input.saveAudioFiles && input.speed === 1;
}

export function resolvePlaybackMode(input: PlaybackModeInput): PlaybackModeResult {
  const warnings: string[] = [];

  if (!input.isGateway || input.hasCustomPath) {
    return { mode: "buffered", warnings };
  }

  if (!shouldProbeFfplay(input)) {
    if (input.saveAudioFiles) {
      warnings.push("Save audio requires buffered mode — streaming disabled");
      return { mode: "buffered", warnings };
    }

    warnings.push("Playback speed requires buffered mode — streaming disabled");
    return { mode: "buffered", warnings };
  }

  if (!input.ffplayAvailable) {
    warnings.push("ffplay not found — streaming disabled");
    return { mode: "buffered", warnings };
  }

  return { mode: "stream", warnings };
}

export function parseSpeed(value?: string): number {
  const parsed = Number(value ?? "1");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
  }
  return Math.max(0.25, Math.min(4.0, parsed));
}
