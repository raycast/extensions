import { getCustomNpxPath, preferences } from "../preferences";

/** The executable and arguments for a ccusage call, honoring the direct-command and custom npx preferences. */
export const ccusageCommand = (args: string[]): [string, string[]] =>
  preferences.useDirectCcusageCommand
    ? ["ccusage", args]
    : [getCustomNpxPath() ?? "npx", ["--yes", "ccusage@latest", ...args]];
