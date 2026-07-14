import { launchScreenLexAction } from "./launch";

export default async function Command() {
  await launchScreenLexAction("open-settings");
}
