import { closeMainWindow } from "@raycast/api";
import { failed, link } from "./nextterm";

export default async function Command() {
  try {
    await closeMainWindow();
    await link("goto");
  } catch (error) {
    await failed(error);
  }
}
