import { Clipboard } from "@raycast/api";
import { handleTextToFile } from "./api/supporting";

export default async function main() {
  await handleTextToFile(Clipboard.readText, Clipboard.paste, "File pasted");
}
