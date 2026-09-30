import runNoViewMultiCommand from "./lib/runNoViewMultiCommand";
import { toggleCamera } from "./lib/multi";

export default async () => {
  await runNoViewMultiCommand(toggleCamera);
};
