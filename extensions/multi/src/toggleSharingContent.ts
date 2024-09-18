import runNoViewMultiCommand from "./lib/runNoViewMultiCommand";
import { toggleSharingContent } from "./lib/multi";

export default async () => {
  await runNoViewMultiCommand(toggleSharingContent);
};
