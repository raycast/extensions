import runNoViewMultiCommand from "./lib/runNoViewMultiCommand";
import { toggleMicrophone } from "./lib/multi";

export default async () => {
  await runNoViewMultiCommand(toggleMicrophone);
};
