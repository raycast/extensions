import { LaunchProps, PopToRootType, Toast, showHUD, showToast } from "@raycast/api";
import { sendMemo } from "./api";

interface TodoArguments {
  text: string;
}

export default async function Command(props: LaunchProps<{ arguments: TodoArguments }>) {
  const { text = "" } = props.arguments;

  await showToast({
    style: Toast.Style.Animated,
    title: "Sending",
  });

  try {
    const response = await sendMemo({
      content: text,
      visibility: "PRIVATE",
      resourceIdList: [],
    });

    if (response?.name) {
      // Raycast 2 keeps no-view argument commands open after a toast; HUD dismisses and clears.
      await showHUD("Sent", {
        clearRootSearch: true,
        popToRootType: PopToRootType.Immediate,
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed",
      });
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
