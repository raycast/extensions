import { runQuickKey } from "./lib/actions";

export default async function Command() {
  await runQuickKey("PowerOn", "Power on");
}
