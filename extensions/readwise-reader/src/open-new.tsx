import { open, closeMainWindow } from "@raycast/api";
import { BASE_URL } from "./utils";

export default async function New() {
  await open(BASE_URL + "new");
  await closeMainWindow();
}
