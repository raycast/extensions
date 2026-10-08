import { showHUD } from "@raycast/api";
import { skipBy } from "./lib/companion-extras";
import { withConnection } from "./lib/connection";
import { showErrorToast } from "./lib/errors";

export default async function Command() {
  try {
    await withConnection((conn) => skipBy(conn, -10));
    await showHUD("⏪ -10s");
  } catch (error) {
    await showErrorToast(error);
  }
}
