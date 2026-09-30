import { showHUD } from "@raycast/api";
import { runYabaiCommand } from "./helpers/scripts";
import { showFailureToast } from "@raycast/utils";

export default async () => {
  try {
    const { stderr } = await runYabaiCommand("-m space --rotate 90");

    if (stderr) {
      throw new Error(stderr);
    }

    showHUD("Rotated window tree");
  } catch (error) {
    if (
      error instanceof Error &&
      typeof error?.message === "string" &&
      error.message.includes("Yabai executable not found")
    ) {
      return;
    }

    showFailureToast(error, {
      title: "Failed to rotate window tree, make sure you have Yabai installed and running.",
    });
  }
};
