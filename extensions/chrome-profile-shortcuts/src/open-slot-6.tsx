import { openSlot } from "./open-slot";

export default async function Command() {
  await openSlot(6);
}
