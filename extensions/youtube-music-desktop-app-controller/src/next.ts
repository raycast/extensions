import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { controlYouTubeMusic } from "./utils";
import { COMMANDS } from "./consts";

export default async () => {
  try {
    await controlYouTubeMusic(COMMANDS.NEXT);
    await showToast({ style: Toast.Style.Success, title: "Command sent", message: COMMANDS.NEXT });
    await closeMainWindow();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
};
