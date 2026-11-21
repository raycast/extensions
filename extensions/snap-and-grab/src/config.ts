export interface SnapPreferences {
  screenshotFolder?: string;
  confirmation?: string;
  showPreviews?: boolean;
}

export function resolveConfiguration(preferences: SnapPreferences) {
  const duration = preferences.confirmation ?? "1.5";
  return {
    folder: preferences.screenshotFolder?.trim() ?? "",
    previews: preferences.showPreviews ?? true,
    confirmationDuration: ["0", "1.5", "3"].includes(duration) ? Number(duration) : 1.5,
  };
}
