import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { markAuthVerified } from "./lib/auth-cache";
import { getAuthStatus, loginHey, runHey } from "./lib/hey";
import type { HeyDoctorCheck } from "./lib/types";

export default async function Command() {
  await closeMainWindow();

  try {
    const auth = await getAuthStatus();
    const doctor = await runHey<HeyDoctorCheck[]>(["doctor", "--json"]);

    const failedChecks = doctor.data.filter((check) => check.status !== "ok");
    const authLine = auth.status.authenticated
      ? auth.status.expired
        ? "Authenticated but expired"
        : "Authenticated"
      : "Not authenticated";

    if (!auth.status.authenticated || auth.status.expired) {
      await showToast({
        style: Toast.Style.Animated,
        title: "HEY not authenticated",
        message: `Using ${auth.path}. Opening login…`,
      });
      await loginHey();
      await showHUD("HEY login completed");
      return;
    }

    if (failedChecks.length > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: authLine,
        message: failedChecks.map((check) => `${check.name}: ${check.message}`).join(" · "),
      });
      return;
    }

    await markAuthVerified();
    await showHUD(`HEY: ${authLine} (${auth.path})`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "HEY check failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
