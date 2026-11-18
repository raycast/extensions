import { launchScreenLexAction } from "./launch";

export default async function Command() {
  await launchScreenLexAction("capture-full-screen");
}
