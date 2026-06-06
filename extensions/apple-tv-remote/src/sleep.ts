import { showHUD } from "@raycast/api";
import { sleepDevice } from "./lib/companion-extras";
import { withConnection } from "./lib/connection";
import { showErrorToast } from "./lib/errors";

export default async function Command() {
  try {
    await withConnection((conn) => sleepDevice(conn));
    await showHUD("😴 Sleeping");
  } catch (error) {
    await showErrorToast(error);
  }
}
