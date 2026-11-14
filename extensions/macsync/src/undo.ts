import { confirmAlert, showHUD } from "@raycast/api";
import { failure, macsync } from "./run";

export default async function Command() {
  const ok = await confirmAlert({
    title: "Undo the last apply?",
    message: "This puts the Dock back as it was. Apps that were installed stay installed.",
  });
  if (!ok) return;
  try {
    await macsync("undo", "--yes");
    await showHUD("Dock restored.");
  } catch (e) {
    await showHUD(failure(e));
  }
}
