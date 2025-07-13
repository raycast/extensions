import { LaunchContext, handleCrossLaunch, toggleDND } from "./utils";

export default async ({ launchContext = { suppressHUD: false } }: { launchContext?: LaunchContext }) => {
  const { suppressHUD, callbackLaunchOptions } = launchContext;
  const dndStatus = await toggleDND(suppressHUD);
  await handleCrossLaunch(callbackLaunchOptions, { dndStatus });
};
