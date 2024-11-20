import { LaunchContext, statusDND } from "./utils";

export default async ({ launchContext = { supressHUD: false } }: { launchContext?: LaunchContext }) => {
  await statusDND({ launchContext });
};
