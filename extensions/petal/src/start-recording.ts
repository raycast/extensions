import { checkPetalInstallation, openPetalDeepLink } from "./utils";

export default async function Command() {
  const isInstalled = await checkPetalInstallation();
  if (!isInstalled) return;
  await openPetalDeepLink("start");
}
