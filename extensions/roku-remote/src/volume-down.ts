import { runQuickKey } from "./lib/actions";

export default async function Command() {
  await runQuickKey("VolumeDown", "Volume down");
}
