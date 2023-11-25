import { closeMainWindow, showHUD } from "@raycast/api";
import { activateRandomScreenSaver } from "./utils/applescript-utils";

export default async () => {
  try {
    await closeMainWindow();
    const result = await activateRandomScreenSaver();
    if (!result.success) {
      await showHUD(result.message);
    }
  } catch (e) {
    console.error(String(e));
    await showHUD(String(e));
  }
};
