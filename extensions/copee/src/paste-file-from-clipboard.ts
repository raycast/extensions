import { Clipboard } from "@raycast/api";
import { handleTextToFile } from "./api/helpers";

export default async function main() {
  await handleTextToFile(Clipboard.readText, Clipboard.paste, "File pasted");
}
