import { launchAnvilURL } from "./launch-anvil";

export default async function OpenSigningInspectorCommand() {
  await launchAnvilURL("anvil://tool/signing-inspector");
}
