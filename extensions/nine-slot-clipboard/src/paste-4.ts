import { pasteSlot } from "./actions";

export default async function Command() {
  await pasteSlot(4);
}
