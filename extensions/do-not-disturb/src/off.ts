import { LaunchContext, turnOffDND } from "./utils";

export default async ({ launchContext = {} }: { launchContext: LaunchContext }) => {
  const { suppressHUD } = launchContext;
  await turnOffDND(suppressHUD);
};
