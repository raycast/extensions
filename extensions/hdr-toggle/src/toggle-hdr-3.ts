import { runSlot } from "./lib/slot-command";

export default async function Command() {
  await runSlot(3);
}
