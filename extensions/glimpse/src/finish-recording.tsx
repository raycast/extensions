import { LaunchProps, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { glimpse } from "./glimpse";
import { refreshMenuBar } from "./recording";

export default async function Command(props: LaunchProps<{ arguments: Arguments.FinishRecording }>) {
  const name = props.arguments.name?.trim();
  try {
    await glimpse<{ item: { id: string; name: string } }>(["record", "finish", ...(name ? ["--name", name] : [])]);
    await refreshMenuBar();
    await showHUD("Saved to Glimpse Library");
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't finish recording" });
  }
}
