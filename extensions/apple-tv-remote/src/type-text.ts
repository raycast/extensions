import { LaunchProps, showHUD } from "@raycast/api";
import { setText } from "@bharper/atv-js";
import { withConnection } from "./lib/connection";
import { showErrorToast } from "./lib/errors";

export default async function Command(props: LaunchProps<{ arguments: { text: string } }>) {
  await withConnection((conn) => setText(conn, props.arguments.text))
    .then(() => showHUD("⌨️ Sent text to Apple TV"))
    .catch(showErrorToast);
}
