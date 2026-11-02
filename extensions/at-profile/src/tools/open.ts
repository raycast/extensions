import { findVisibleApp } from "../helpers/apps";
import { openProfile } from "../helpers/open-profile";
import { Input } from "../types";

/**
 * Opens a profile on a specified social app
 * @param input - Contains profile name and app identifier
 * @param input.profile - Profile/username to open (@ prefix will be removed)
 * @param input.app - App identifier/value to open the profile on
 */
const tool = async (input: Input) => {
  const app = await findVisibleApp(input.app);
  if (!app) {
    throw new Error(`App "${input.app}" is not available. It may be hidden in Manage Apps.`);
  }

  const result = await openProfile(input.profile, app.value);
  return `Opened @${result.profile} on ${result.app.name}.`;
};
export default tool;
