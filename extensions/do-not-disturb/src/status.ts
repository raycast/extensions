import { LaunchContext, statusDND } from "./utils";

export default async ({ launchContext = { suppressHUD: false } }: { launchContext?: LaunchContext }) => {
  const { suppressHUD } = launchContext;
  await statusDND(suppressHUD);
};
