import { installedTools, requireMise } from "../ai/tools";

/**
 * Lists the dev tools mise has installed, with each installed version, whether it is active for the
 * global config, the version that was requested, and the config file that requested it. Runs
 * `mise ls --json` from the home directory.
 */
export default async function tool() {
  return installedTools(await requireMise());
}
