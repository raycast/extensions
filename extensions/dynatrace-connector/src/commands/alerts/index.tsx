import { getPreferenceValues, LocalStorage, showHUD, showToast, Toast } from "@raycast/api";
import { getActiveTenant } from "../../lib/tenants";
import { getAccessToken } from "../../lib/auth";

interface Preferences {
  enableAlerts: boolean;
}

const STORAGE_KEY = "dt_last_problem_count";

export default function BackgroundAlertsCommand() {
  const prefs = getPreferenceValues<Preferences>();
  if (!prefs.enableAlerts) return;

  void checkProblems();
}

async function checkProblems() {
  try {
    const tenant = await getActiveTenant();
    if (!tenant) return;

    const token = await getAccessToken(tenant);
    const endpoint = `${tenant.tenantEndpoint}/platform/storage/query/v1/query:execute`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: 'fetch dt.davis.problems | filter event.status == "OPEN"',
        timeFrame: { type: "RELATIVE", value: 3600 },
      }),
    });

    if (!response.ok) return;

    const data = (await response.json()) as { result?: { records?: unknown[] } };
    const count = data.result?.records?.length ?? 0;

    const lastStr = await LocalStorage.getItem<string>(STORAGE_KEY);
    const last = lastStr ? parseInt(lastStr, 10) : 0;

    await LocalStorage.setItem(STORAGE_KEY, String(count));

    if (count > last) {
      const diff = count - last;
      const msg = `${diff} new problem${diff > 1 ? "s" : ""}`;
      await showHUD(`🚨 ${msg}`);
      await showToast({
        style: Toast.Style.Failure,
        title: "New Problems Detected",
        message: msg,
      });
    }
  } catch {
    // Fail silently
  }
}
