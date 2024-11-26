import { LaunchContext, toggleDND } from "./utils";

export default async ({ launchContext = { suppressHUD: false } }: { launchContext?: LaunchContext }) => {
  const { suppressHUD } = launchContext;
  await toggleDND(suppressHUD);
};
