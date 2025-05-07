import { LaunchContext, handleCrossLaunch, turnOffDND } from "./utils";

export default async ({ launchContext = {} }: { launchContext: LaunchContext }) => {
  const { suppressHUD, callbackLaunchOptions } = launchContext;
  await turnOffDND(suppressHUD);
  await handleCrossLaunch(callbackLaunchOptions);
};
