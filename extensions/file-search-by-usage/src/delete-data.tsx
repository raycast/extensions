import { Alert, Toast, confirmAlert, showToast } from "@raycast/api";
import { describeErased, eraseEverything } from "./lib/erase";

/** Clears all extension data from a top-level Raycast command. */
export default async function Command() {
  const confirmed = await confirmAlert({
    title: "Delete all data and cache?",
    message:
      "Usage rankings, pins, search history, learned shortcuts and the Google " +
      "Drive index. Your files are not touched. This cannot be undone.",
    primaryAction: {
      title: "Delete Everything",
      style: Alert.ActionStyle.Destructive,
    },
  });
  if (!confirmed) return;

  const erased = await eraseEverything();
  if (!erased) return;
  await showToast({
    style: Toast.Style.Success,
    title: "Deleted everything",
    message: describeErased(erased),
  });
}
