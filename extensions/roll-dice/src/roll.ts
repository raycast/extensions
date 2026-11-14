import { Clipboard, LaunchProps, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { DiceError, roll } from "./dice";

export default async function Command(props: LaunchProps<{ arguments: Arguments.Roll }>) {
  const input = props.arguments.dice?.trim() || "1d20";

  try {
    const total = String(roll(input).total);

    await Clipboard.copy(total);
    await showHUD(total);
  } catch (error) {
    if (error instanceof DiceError) {
      await showFailureToast(error, { title: "Bad dice notation" });
      return;
    }
    throw error;
  }
}
