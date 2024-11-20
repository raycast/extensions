import { LaunchContext, turnOnDND } from "./utils";

export default async ({ launchContext = { supressHUD: false } }: { launchContext?: LaunchContext }) => {
  await turnOnDND({ launchContext });
};
