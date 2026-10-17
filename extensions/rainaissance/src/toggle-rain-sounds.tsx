import { closeMainWindow, open } from "@raycast/api";

export default async function main() {
  const url = "rainaissance://toggle-sounds";
  await closeMainWindow();
  await open(url);
}
