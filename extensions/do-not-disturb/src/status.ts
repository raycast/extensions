import { LaunchContext, handleCrossLaunch, statusDND } from "./utils";

export default async ({ launchContext = { suppressHUD: false } }: { launchContext?: LaunchContext }) => {
  const { suppressHUD, callbackLaunchOptions } = launchContext;
  const dndStatus = await statusDND(suppressHUD);
  handleCrossLaunch(callbackLaunchOptions, { dndStatus });
};
