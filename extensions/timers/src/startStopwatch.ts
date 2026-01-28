import { closeMainWindow } from "@raycast/api";
import { startStopwatch } from "./backend/stopwatchBackend";
import { SWInlineArgs } from "./backend/types";

export default async (props: { arguments: SWInlineArgs }) => {
  await closeMainWindow();
  if (props.arguments.name) {
    startStopwatch({ swName: props.arguments.name });
  } else {
    startStopwatch({});
  }
};
