import runNoViewMultiCommand from "./lib/runNoViewMultiCommand";
import { copyCallLink } from "./lib/multi";

export default async () => {
  await runNoViewMultiCommand(copyCallLink);
};
