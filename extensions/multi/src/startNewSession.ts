import runNoViewMultiCommand from "./lib/runNoViewMultiCommand";
import { startNewSession } from "./lib/multi";

export default async () => {
  await runNoViewMultiCommand(startNewSession);
};
