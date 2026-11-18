import { showFailureToast } from "@raycast/utils";
import { createHash } from "node:crypto";
import {
  LocalStorage,
  environment,
  getPreferenceValues,
  launchCommand,
  LaunchType,
  showToast,
  Toast,
  openExtensionPreferences,
} from "@raycast/api";
import { LuxaforService, Result, resultMessage } from "./luxafor-service";
import { decodeState, Command } from "./luxafor-state";
import { requestGuard } from "./request-guard";

export function createService(): LuxaforService {
  const config = getPreferenceValues<Preferences>();
  // Separate accepted histories when the configured target changes. No raw ID is stored.
  const scope = createHash("sha256").update(`${config.apiEndpoint}:${config.userId.trim()}`).digest("hex");
  const key = `luxafor-history-v2-${scope}`;
  return new LuxaforService(
    config,
    {
      async read() {
        return decodeState(await LocalStorage.getItem(key), await LocalStorage.getItem("luxafor-global-status"));
      },
      async write(state) {
        await LocalStorage.setItem(key, JSON.stringify(state));
      },
    },
    (url, init) => fetch(url, init),
    requestGuard(environment.supportPath),
  );
}

export async function refreshMenu(): Promise<boolean> {
  if (process.platform !== "darwin" || environment.entryPointName === "luxafor-status") return true;
  try {
    await launchCommand({ name: "luxafor-status", type: LaunchType.Background });
    return true;
  } catch {
    // Disabled menu commands are optional. This cannot turn a sent request into a failure.
    return false;
  }
}

export async function reportResult(result: Result): Promise<void> {
  if (result.ok && result.persisted) {
    await showToast({ style: Toast.Style.Success, title: "Request Accepted", message: resultMessage(result) });
    return;
  }
  // Never pass raw transport/storage errors or their stacks to the report action.
  await showFailureToast(resultMessage(result), {
    title: result.ok
      ? "Request Accepted"
      : result.uncertain
        ? "Delivery Uncertain"
        : result.reason === "application"
          ? "API Reported an Error"
          : "Request Not Sent",
    ...(!result.ok
      ? { primaryAction: { title: "Open Extension Preferences", onAction: openExtensionPreferences } }
      : {}),
  });
}

export async function runDirect(command: Command): Promise<void> {
  // No-view entries are user actions only; an accidental background launch never sends.
  if (environment.launchType === LaunchType.Background) return;
  try {
    const result = await createService().send(command);
    await refreshMenu();
    await reportResult(result);
  } catch {
    await showFailureToast(
      "The command could not finish. Check the light before resending; delivery may be uncertain.",
      {
        title: "Command Interrupted",
      },
    );
  }
}
