import { Clipboard } from "@raycast/api";
import { handleTextToFile } from "./api/supporting";

export default async function main() {
  handleTextToFile(Clipboard.readText, Clipboard.copy);
}
