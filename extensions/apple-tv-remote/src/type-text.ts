import { LaunchProps, showHUD } from "@raycast/api";
import { setText } from "@bharper/atv-js";
import { withConnection } from "./lib/connection";
import { showErrorToast } from "./lib/errors";

export default async function Command(props: LaunchProps<{ arguments: { text: string } }>) {
  try {
    await withConnection((conn) => setText(conn, props.arguments.text));
    await showHUD("⌨️ Sent text to Apple TV");
  } catch (error) {
    await showErrorToast(error);
  }
}
