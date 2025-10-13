import { closeMainWindow } from "@raycast/api";
import { fullScreen } from "swift:../swift/fullscreen";

export default async function Command(props: { arguments: { text: string } }) {
  const text = props.arguments.text;

  closeMainWindow({ clearRootSearch: true });
  await fullScreen(text);
}
