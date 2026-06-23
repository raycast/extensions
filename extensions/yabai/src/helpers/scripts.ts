import { showToast, Toast } from "@raycast/api";
import { execa, execaCommand } from "execa";
import { formatYabaiPathLookupError, resolveYabaiPath, YABAI_EXEC_ENV } from "./yabai-path";

function quoteShellArgument(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

// Keep execaCommand's escaped-space behavior for the argument string while passing the executable separately.
function parseCommandArguments(command: string): string[] {
  const args: string[] = [];

  for (const arg of command.trim().split(/ +/g)) {
    if (!arg) {
      continue;
    }

    const previousArg = args[args.length - 1];
    if (previousArg?.endsWith("\\")) {
      args[args.length - 1] = `${previousArg.slice(0, -1)} ${arg}`;
    } else {
      args.push(arg);
    }
  }

  return args;
}

export const runYabaiCommand = async (command: string, opt?: { shell?: boolean }) => {
  const lookup = resolveYabaiPath();

  if (!lookup.path) {
    const message = `Yabai executable not found. ${formatYabaiPathLookupError(lookup)}`;
    await showToast(Toast.Style.Failure, "Yabai executable not found", message);
    return { stdout: "", stderr: message };
  }

  const options = {
    ...opt,
    env: YABAI_EXEC_ENV,
  };

  if (opt?.shell) {
    return await execaCommand([quoteShellArgument(lookup.path), command].join(" "), options);
  }

  return await execa(lookup.path, parseCommandArguments(command), options);
};
