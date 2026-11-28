import { LaunchProps, showHUD } from "@raycast/api";
import { report, setStatus } from "./lib/meeting";

export default async function Command(props: LaunchProps<{ arguments: Arguments.SetStatus }>) {
  try {
    const title = await setStatus(props.arguments.status);
    await showHUD(`Teams status: ${title}`);
  } catch (error) {
    await report(error, "Could not set the status");
  }
}
