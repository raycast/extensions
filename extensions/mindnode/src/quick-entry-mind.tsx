import { closeMainWindow, open } from "@raycast/api";

export default async function Command() {
  const url = "mindnode://quickEntry?clearExisting='false?'";
  await closeMainWindow();
  open(url);
}