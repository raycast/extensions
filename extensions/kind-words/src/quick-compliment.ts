import { Clipboard, showHUD } from "@raycast/api";
import { compliments } from "./data/compliments.schema";

export default async function main(): Promise<void> {
  const pick = compliments[Math.floor(Math.random() * compliments.length)];
  await Clipboard.copy(pick.text);
  await showHUD(`Copied: ${pick.text}`);
}
