export interface CreateDefaults {
  baseUrl: string;
  ttlMs: number;
  revealBudget: number;
  pasteAfterCreate: boolean;
  requireTurnstile?: boolean;
  allowViewerDelete?: boolean;
  revealAnchored?: boolean;
}

export function createDefaultsFromPreferences(
  preferences: Preferences,
): CreateDefaults {
  return {
    baseUrl: preferences.base,
    ttlMs: Number(preferences.defaultTtl),
    revealBudget: Number(preferences.defaultReveals),
    pasteAfterCreate: preferences.pasteAfterCreate,
    requireTurnstile: preferences.defaultRequireTurnstile,
    allowViewerDelete: preferences.defaultAllowViewerDelete,
    revealAnchored: preferences.defaultRevealAnchored,
  };
}
