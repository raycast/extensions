export type BudgetAlertSettings = {
  enabled: boolean;
  threshold: number;
};

export function parseBudgetAlertThreshold(raw: string | undefined): number {
  const val = Number(raw?.trim());
  if (!Number.isFinite(val)) return 80;
  return Math.min(100, Math.max(1, Math.round(val)));
}

export function getBudgetAlertSettings(
  prefs: Preferences,
): BudgetAlertSettings {
  return {
    enabled: prefs.enableBudgetAlerts === true,
    threshold: parseBudgetAlertThreshold(prefs.alertThreshold),
  };
}
