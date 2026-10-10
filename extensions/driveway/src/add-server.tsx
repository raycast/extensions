import { launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ServerForm, ServerFormInput } from "./components/ServerForm";
import { addServer } from "./lib/storage";
import { refreshMenuBar } from "./lib/menu-bar-cache";

export default function Command() {
  async function handleSave(values: ServerFormInput) {
    await addServer(values);
    await refreshMenuBar();
    await showToast({
      style: Toast.Style.Success,
      title: "Drive added",
      message: values.alias ?? `${values.host}/${values.path}`,
    });
    // The drive is saved either way; only the jump to Manage Drives can fail,
    // which it does when that command is turned off in Preferences.
    try {
      await launchCommand({ name: "index", type: LaunchType.UserInitiated });
    } catch (error) {
      await showFailureToast(error, { title: "Drive added, but Manage Drives wouldn't open" });
    }
  }

  return <ServerForm submitTitle="Add Drive" onSave={handleSave} />;
}
