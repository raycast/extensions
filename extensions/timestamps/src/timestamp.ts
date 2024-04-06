import { Clipboard } from "@raycast/api";

export default async function pasteTimestamp() {
  const ts = Date.now();
  await Clipboard.paste(ts);
}
