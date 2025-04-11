import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { activateScreenSaver } from "./utils/applescript-utils";

export default async () => {
  await closeMainWindow();
  const result = await activateScreenSaver();
  if (!result.success) {
    await showToast({ title: result.message, style: Toast.Style.Failure });
  }
};
