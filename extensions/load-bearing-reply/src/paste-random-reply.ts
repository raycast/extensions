import { Clipboard, showHUD } from "@raycast/api";
import { replies } from "./replies";

export default async function command() {
  const reply = replies[Math.floor(Math.random() * replies.length)];
  await Clipboard.paste(reply.text);
  await showHUD("Pasted a load-bearing reply");
}
