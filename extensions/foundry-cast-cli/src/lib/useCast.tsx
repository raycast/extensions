import { Clipboard, Toast, showToast } from "@raycast/api";
import { useState } from "react";

import { CastArg, Opts } from "./types";
import { defaultOutputParser, defaultErrorParser, execCast } from "./utils";

export function useCast<Args>(cmd: string, args: Partial<Record<keyof Args, CastArg>>, opts?: Opts) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState("");

  const saveToClipboard = opts?.saveToClipboard ?? true;
  const successMessage = opts?.successMessage ?? "Copied to clipboard";
  const outputParser = opts?.outputParser ?? defaultOutputParser;
  const errorParser = opts?.errorParser ?? defaultErrorParser;

  async function execute(withArgs: Args) {
    try {
      checkValidArgs(withArgs);
    } catch (err: any) {
      showToast({ style: Toast.Style.Failure, title: err.message });
      return;
    }

    const fullCommand = `${cmd} ${parseArgs(withArgs)}`;
    const network = parseNetwork(withArgs);

    try {
      setIsLoading(true);

      const { stdout, stderr } = await execCast(fullCommand, network);
      if (stderr) throw new Error(stderr);

      const output = outputParser(stdout);

      if (saveToClipboard) Clipboard.copy(output);

      setResult(output);
      showToast({ style: Toast.Style.Success, title: successMessage });

      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);

      if (err.stderr) {
        const error = errorParser(err.stderr, fullCommand);
        showToast({ style: Toast.Style.Failure, title: error });
      } else {
        showToast({ style: Toast.Style.Failure, title: err.message });
      }
    }
  }

  function parseArgs(withArgs: Args) {
    const allArgs = Object.entries(args) as [keyof Args, CastArg][];

    const parsedArgs = allArgs
      .filter(([k, _]) => withArgs[k])
      .filter(([_, arg]) => arg.name !== "network")
      .map(([j, arg]) => {
        if (arg.type === "boolean") return arg.flag;
        return `${arg.flag ? arg.flag : ""} ${withArgs[j]}`;
      })
      .join(" ");

    return parsedArgs;
  }

  function parseNetwork(withArgs: Args) {
    const networkArg = (withArgs as any).network;
    if (!networkArg) return 1;
    return Number(networkArg);
  }

  function checkValidArgs(withArgs: Args) {
    const allArgs = Object.entries(args) as [keyof Args, CastArg][];

    const missingArgs = allArgs.filter(([k, arg]) => arg.required && !withArgs[k]);
    if (missingArgs.length > 0) {
      throw new Error(`Missing required args: ${missingArgs.map(([_, arg]) => arg.name).join(", ")}`);
    }

    const invalidArgs = allArgs.filter(([k, arg]) => arg.type === "boolean" && typeof withArgs[k] !== "boolean");
    if (invalidArgs.length > 0) {
      throw new Error(`Invalid args: ${invalidArgs.map(([_, arg]) => arg.name).join(", ")}`);
    }

    return true;
  }

  return { execute, isLoading, result };
}
