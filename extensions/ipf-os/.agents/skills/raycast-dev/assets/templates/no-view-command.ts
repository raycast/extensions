import { LaunchProps, Toast, showHUD, showToast } from "@raycast/api";

interface QuickActionArguments {
  targetId?: string;
}

export default async function Command(
  props: LaunchProps<{ arguments: QuickActionArguments }>
) {
  const targetId = props.arguments.targetId;

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Executing quick action...",
  });

  try {
    // Perform background operation
    console.log("Processing background action for:", targetId);

    toast.hide();
    await showHUD("Action completed successfully");
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Action failed";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
