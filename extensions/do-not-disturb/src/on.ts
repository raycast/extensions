import { LaunchContext, turnOnDND } from "./utils";

export default async ({ launchContext = {} }: { launchContext?: LaunchContext }) => {
  const { suppressHUD } = launchContext;
  await turnOnDND(suppressHUD);
};
