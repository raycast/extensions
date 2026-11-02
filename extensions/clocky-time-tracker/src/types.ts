export type Pause = {
  start: string; // ISO
  end?: string; // ISO
};

export type Session = {
  id: string;
  start: string; // ISO
  end?: string; // ISO
  pauses?: Pause[];
};

export type PendingGapSuggestion = {
  sessionId: string;
  suggestedEndIso: string;
  gapMs: number;
};

export type StatusState = {
  lastTickIso?: string;
  awakeSinceIso?: string;
  dismissedGapKey?: string;
  dismissedAwakeKey?: string;
  pendingGap?: PendingGapSuggestion;
};
