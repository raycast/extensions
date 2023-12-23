import { showHUD } from "@raycast/api";
import { runYabaiCommand } from "./helpers/scripts";
import { showFailureToast } from "@raycast/utils";

export default async () => {
  try {
    const { stderr } = await runYabaiCommand("-m space --rotate 90");

    if (stderr) {
      throw new Error();
    }

    showHUD("Rotated window tree");
  } catch (error) {
    showFailureToast(error, {
      title: "Failed to rotate window tree, make sure you have Yabai installed and running.",
    });
  }
};
