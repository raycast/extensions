import {
  environment,
  getPreferenceValues,
  LaunchType,
  showHUD,
  updateCommandMetadata,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getBudgetAlertSettings } from "./lib/budget-alert-settings";
import {
  checkBudgetThresholdAlerts,
  formatMonitorSubtitle,
  formatUserInitiatedSummary,
  showBudgetAlertToasts,
} from "./lib/budget-alerts";

export default async function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const settings = getBudgetAlertSettings(prefs);
  const isBackground = environment.launchType === LaunchType.Background;

  let results;
  try {
    results = await checkBudgetThresholdAlerts(prefs, {
      recordAlert: isBackground && settings.enabled,
      settings,
    });
  } catch (error) {
    if (!isBackground) {
      await showFailureToast(error, { title: "Budget monitor failed" });
      return;
    }
    await showFailureToast(error, { title: "Budget monitor" });
    return;
  }

  const subtitle = formatMonitorSubtitle(results, settings.threshold);
  await updateCommandMetadata({ subtitle });

  if (isBackground) {
    if (!settings.enabled) return;

    const scanIssues = results.some(
      (r) => r.skipReason === "errors-zero-spend",
    );
    if (scanIssues) {
      await showFailureToast("Some usage sources returned errors", {
        title: "Budget monitor",
      });
    }

    await showBudgetAlertToasts(results);
    return;
  }

  const summary = formatUserInitiatedSummary(
    results,
    settings.threshold,
    settings.enabled,
    prefs.currency || "USD",
  );
  await showHUD(summary);
}
