import runNoViewMultiCommand from "./lib/runNoViewMultiCommand";
import { leaveSession } from "./lib/multi";

export default async () => {
  await runNoViewMultiCommand(leaveSession);
};
