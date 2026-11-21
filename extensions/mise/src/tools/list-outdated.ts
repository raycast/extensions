import { outdatedTools, requireMise } from "../ai/tools";

/**
 * Lists the global tools that have a newer version than the one installed, and the tools mise could
 * not check for updates. Runs `mise outdated --json` with the same flags as Show Outdated Tools.
 * Call it before upgrading, to say what an upgrade would change.
 */
export default async function tool() {
  return outdatedTools(await requireMise());
}
