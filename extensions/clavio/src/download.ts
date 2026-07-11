import { open, showHUD } from "@raycast/api";

export default async function main() {
  await open("https://clavioapp.com/download");
  await showHUD("Opening the Clavio download page");
}
