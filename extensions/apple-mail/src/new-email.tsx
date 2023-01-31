import { closeMainWindow } from "@raycast/api";
import { createNewEmail } from "./utils";

export default async function Command() {
  await closeMainWindow();
  await createNewEmail();
}
