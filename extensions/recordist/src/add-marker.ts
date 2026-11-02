import { LaunchProps, showHUD } from "@raycast/api";
import { showFailure } from "./lib/app";
import { addMarker, isNothingRecording } from "./lib/recordist";

export default async function Command(props: LaunchProps<{ arguments: Arguments.AddMarker }>) {
  const label = props.arguments.label?.trim() || undefined;
  try {
    await addMarker(label);
    await showHUD(label ? `Marker added: ${label}` : "Marker added");
  } catch (err) {
    if (isNothingRecording(err)) {
      await showHUD("Nothing is recording, so there is nothing to mark");
      return;
    }
    await showFailure(err);
  }
}
