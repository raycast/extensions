import { LaunchContext, handleCrossLaunch, turnOnDND } from "./utils";

export default async ({ launchContext = {} }: { launchContext?: LaunchContext }) => {
  const { suppressHUD, callbackLaunchOptions } = launchContext;
  await turnOnDND(suppressHUD);
  await handleCrossLaunch(callbackLaunchOptions);
};
