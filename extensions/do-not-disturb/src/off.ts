import { LaunchContext, turnOffDND } from "./utils";

export default async ({ launchContext = { supressHUD: false } }: { launchContext?: LaunchContext }) => {
  await turnOffDND({ launchContext });
};
