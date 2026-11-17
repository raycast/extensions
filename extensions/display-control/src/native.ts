import { adjustControl, listMonitors, readControl, setControl } from "swift:../swift/DisplayHelper";
import type { Execute } from "./lib/m1ddc";

export const executeNative: Execute = async (args, signal) => {
  signal?.throwIfAborted();
  let result;
  switch (args[0]) {
    case "list":
      result = await listMonitors();
      break;
    case "read":
      result = await readControl(args[1], args[2]);
      break;
    case "adjust":
      result = await adjustControl(args[1], args[2], Number(args[3]));
      break;
    case "set":
      result = await setControl(args[1], args[2], Number(args[3]));
      break;
    default:
      throw new Error("The native monitor command is invalid.");
  }
  signal?.throwIfAborted();
  return JSON.stringify(result);
};
