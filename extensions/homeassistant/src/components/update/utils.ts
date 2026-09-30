import { ha } from "@lib/common";
import { State } from "@lib/haapi";
import { getErrorMessage } from "@lib/utils";
import { Toast, confirmAlert, showToast } from "@raycast/api";

export interface HACSRepo {
  name: string | undefined;
  display_name: string | undefined;
  installed_version: string | undefined;
  available_version: string | undefined;
}

export async function callUpdateInstallService(state: State, options?: { backup?: boolean }) {
  try {
    const backup = options?.backup === false ? false : true;
    if (
      await confirmAlert({
        title: `Installing ${state.attributes.title || ""} update?`,
        message: backup
          ? "A backup will be generated beforehand. If the integration doesn't support backups, an error will be thrown."
          : "No backup will be generated beforehand. It is recommended to do this manually before starting the update.",
      })
    )
      await ha.callService("update", "install", { entity_id: state.entity_id, backup: backup });
  } catch (error) {
    showToast({ style: Toast.Style.Failure, title: "Error", message: getErrorMessage(error) });
  }
}

export async function callUpdateSkipService(state: State) {
  try {
    if (
      await confirmAlert({
        title: `Skip version ${state.attributes.title || ""}?`,
      })
    )
      await ha.callService("update", "skip", { entity_id: state.entity_id });
  } catch (error) {
    showToast({ style: Toast.Style.Failure, title: "Error", message: getErrorMessage(error) });
  }
}

export function getHACSRepositories(state?: State) {
  if (!state || state.entity_id !== "sensor.hacs") {
    return;
  }
  const repos: HACSRepo[] | undefined = state.attributes.repositories;
  if (!repos || repos.length <= 0) {
    return;
  }
  return repos;
}
