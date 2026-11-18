import { closeMainWindow, open } from "@raycast/api";

export default async function main() {
  const url = "rainaissance://toggle-rain";
  await closeMainWindow();
  await open(url);
}
