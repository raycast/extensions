import { showHUD, showToast, Toast } from "@raycast/api";
import { clearStatuses, SERVICE_LABELS } from "./lib/api";
import { configuredServices, getPrefs } from "./lib/preferences";

export default async function Command() {
  const prefs = getPrefs();
  const services = configuredServices(prefs);

  if (services.length === 0) {
    await showHUD(
      "⚠️ No services configured — add a token in Status Nerd preferences",
    );
    return;
  }

  const results = await clearStatuses(services, prefs);
  const ok = results.filter((r) => r.ok).map((r) => SERVICE_LABELS[r.service]);
  const failed = results.filter((r) => !r.ok);

  if (failed.length === 0) {
    await showHUD(`🧹 Status cleared on ${ok.join(", ")}`);
  } else {
    await showToast({
      style: ok.length > 0 ? Toast.Style.Success : Toast.Style.Failure,
      title:
        ok.length > 0
          ? `Cleared on ${ok.join(", ")}`
          : "Failed to clear status",
      message: failed
        .map((f) => `${SERVICE_LABELS[f.service]}: ${f.error}`)
        .join("\n"),
    });
  }
}
