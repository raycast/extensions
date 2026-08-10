import { closeMainWindow, open } from "@raycast/api";
import { HOST } from "./constants";

export default async function Command() {
  await closeMainWindow();
  await open(HOST);
}
