import { LaunchType, launchCommand, showHUD } from "@raycast/api";
import { formatDuration } from "./lib/format";
import { showError, withFolnaro } from "./lib/raycast";
import { byId, describeEntry } from "./lib/timer";
import { t } from "./lib/text";

export default async function StopTimer() {
  try {
    const { entry, name } = await withFolnaro(async (api) => {
      const entry = await api.stopTimer();
      // Naming the project is a nicety; a failure here must not hide that the timer stopped.
      const name = await Promise.all([api.projects(), api.customers({ limit: 500 })])
        .then(([projects, customers]) => describeEntry(entry, { projects: byId(projects), customers: byId(customers) }))
        .catch(() => undefined);
      return { entry, name };
    });
    const duration = formatDuration(entry.duration_seconds);
    const message = name ? t("timer.stoppedFor", { duration, target: name }) : t("timer.stopped", { duration });
    await showHUD(entry.is_billable ? message : `${message}. ${t("timer.notBillable")}`);
  } catch (error) {
    await showError(error);
  }
  // The menu bar shows the change right away instead of at its next interval.
  await launchCommand({ name: "running-timer", type: LaunchType.Background }).catch(() => undefined);
}
