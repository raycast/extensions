import { showToast, Toast } from "@raycast/api";
import { COMMANDS } from "./consts";
import { controlYouTubeMusic } from "./utils";

export default async () => {
  try {
    await controlYouTubeMusic(COMMANDS.PLAY);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
};
