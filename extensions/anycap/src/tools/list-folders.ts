import { callTool, parseFolders } from "../anycap";

export default async function listFolders() {
  return parseFolders(await callTool("categories", {}, "Raycast AI"));
}
