import { checkOmniFocusInstalled } from "./ensure-installed";
import { isProUser } from "./is-pro-user";

export async function getRequirements(): Promise<[boolean, boolean]> {
  const installed = await checkOmniFocusInstalled();
  if (installed) {
    const isPro = await isProUser();
    return [installed, isPro];
  }

  return [false, false];
}
