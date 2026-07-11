import { open, showHUD } from "@raycast/api";

export default async function main() {
  await open("https://clavioapp.com/changelog");
  await showHUD("Opening the Clavio changelog");
}
