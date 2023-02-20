import { closeMainWindow } from "@raycast/api";
import { startStopwatch } from "./stopwatchUtils";
import { SWInlineArgs } from "./types";

export default async (props: { arguments: SWInlineArgs }) => {
  await closeMainWindow();
  if (props.arguments.name) {
    startStopwatch(props.arguments.name);
  } else {
    startStopwatch();
  }
};
