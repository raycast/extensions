import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { controlYouTubeMusic } from "./utils";
import { COMMANDS } from "./consts";

export default async () => {
  try {
    await controlYouTubeMusic(COMMANDS.LIKE);
    await showToast({ style: Toast.Style.Success, title: "Command sent", message: COMMANDS.LIKE });
    await closeMainWindow();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
};
