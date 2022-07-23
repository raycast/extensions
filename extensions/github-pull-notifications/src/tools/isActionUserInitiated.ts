import { environment, LaunchType } from "@raycast/api";

export const isActionUserInitiated = () => {
  const userInitiated = environment.launchType === LaunchType.UserInitiated;

  console.debug(`actionIsUserInitiated: ${userInitiated}`);

  return userInitiated;
};
