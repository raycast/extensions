import { Clipboard, LaunchProps, showHUD } from "@raycast/api";
import { free } from "./lib/portcheck";
import { binary, showError } from "./lib/raycast";

export default async function FreePort(props: LaunchProps<{ arguments: Arguments.FreePort }>) {
  const range = props.arguments.range?.trim() || undefined;
  try {
    const port = (await free(binary(), range)).ports[0];
    if (port === undefined) {
      await showHUD(`No free port in ${range}`);
      return;
    }
    await Clipboard.copy(String(port));
    await showHUD(`Port ${port} is free (copied)`);
  } catch (err) {
    await showError(err);
  }
}
