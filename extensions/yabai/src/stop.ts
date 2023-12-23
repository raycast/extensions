import { showHUD } from "@raycast/api";
import { runYabaiCommand } from "./helpers/scripts";
import { showFailureToast } from "@raycast/utils";

export default async () => {
  try {
    const { stderr } = await runYabaiCommand("--stop-service");

    if (stderr) {
      throw new Error(stderr);
    }

    showHUD("Yabai has been stopped.");
  } catch (error) {
    showFailureToast(error, {
      title: "Failed to stop Yabai.",
    });
  }
};
