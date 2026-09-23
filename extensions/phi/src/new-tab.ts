import { LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { runPhiCommand } from "./command-compatibility";
import { getSpaces, openTab } from "./phi";
import { resolveOpenTabAddress, resolveSpaceArgument } from "./tab-utils";

export default async function NewTab(
  props: LaunchProps<{ arguments: Arguments.NewTab }>,
) {
  try {
    await runPhiCommand("new-tab", async () => {
      const address = resolveOpenTabAddress(props.arguments.url);
      const requestedSpace = props.arguments.space?.trim();
      const spaceId = requestedSpace
        ? resolveSpaceArgument(await getSpaces(), requestedSpace)
        : undefined;
      await openTab(address, spaceId);
    });
    await showHUD("Opened in Phi");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Open Tab",
      message: error instanceof Error ? error.message : "Try again.",
    });
  }
}
