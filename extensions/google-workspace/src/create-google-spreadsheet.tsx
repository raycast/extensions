import { open, closeMainWindow, popToRoot } from "@raycast/api";

export default async function Command() {
  await open("https://docs.google.com/spreadsheets/create");
  await closeMainWindow();
  await popToRoot();
}
