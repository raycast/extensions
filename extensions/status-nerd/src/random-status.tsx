import { showHUD, showToast, Toast } from "@raycast/api";
import { applyStatus, SERVICE_LABELS } from "./lib/api";
import { defaultServices, getPrefs } from "./lib/preferences";
import { randomStatus } from "./lib/statuses";
import { addRecent } from "./lib/storage";

export default async function Command() {
  const prefs = getPrefs();
  const services = defaultServices(prefs);

  if (services.length === 0) {
    await showHUD(
      "⚠️ No default services enabled — check Status Nerd preferences",
    );
    return;
  }

  const status = randomStatus();
  const results = await applyStatus(services, status.emoji, status.text, prefs);

  const ok = results.filter((r) => r.ok).map((r) => SERVICE_LABELS[r.service]);
  const failed = results.filter((r) => !r.ok);

  if (ok.length > 0) {
    await addRecent({
      emoji: status.emoji,
      text: status.text,
      gitlab_emoji: status.gitlab_emoji,
    });
  }

  if (failed.length === 0) {
    await showHUD(`${status.gitlab_emoji} ${status.text}  →  ${ok.join(", ")}`);
  } else {
    await showToast({
      style: ok.length > 0 ? Toast.Style.Success : Toast.Style.Failure,
      title: ok.length > 0 ? `Set on ${ok.join(", ")}` : "Failed to set status",
      message: failed
        .map((f) => `${SERVICE_LABELS[f.service]}: ${f.error}`)
        .join("\n"),
    });
  }
}
