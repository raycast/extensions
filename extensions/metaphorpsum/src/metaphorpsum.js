import { showHUD, Clipboard } from "@raycast/api";
import got from "got";

export default async function main() {
  const data = await got("http://metaphorpsum.com/sentences/3").text();
  await Clipboard.copy(data);
  await showHUD("Copied date to clipboard");
}
