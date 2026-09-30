import { showHUD, Clipboard } from "@raycast/api";
import generateXid from "./xid";

export default async function main() {
  const id = generateXid();
  await Clipboard.copy(id);
  await showHUD("Copied xid to clipboard");
}
