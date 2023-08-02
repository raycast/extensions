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

export async function callUpdateInstallService(state: State) {
  try {
    if (
      await confirmAlert({
        title: `Installing Update ${state.attributes.title || ""}?
        `,
        message: "Backup will be generated before if the integration supports it",
      })
    )
      await ha.callService("update", "install", { entity_id: state.entity_id, backup: true });
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
