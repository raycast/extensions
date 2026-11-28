import { Alert, confirmAlert, showHUD } from "@raycast/api";
import { failure, macsync } from "./run";

const MAX_LINES = 18;

export default async function Command() {
  try {
    const overview = JSON.parse(await macsync("preview", "--json"));
    if (!overview.dockPlan) {
      await showHUD("The Dock already matches.");
      return;
    }
    const lines = (await macsync("preview"))
      .split("\n")
      .filter((line) => !/^ {2}(cask|formula|mas):|^Apps on/.test(line));
    const shown =
      lines.slice(0, MAX_LINES).join("\n") +
      (lines.length > MAX_LINES ? `\n…and ${lines.length - MAX_LINES} more` : "");
    const ok = await confirmAlert({
      title: "Apply this Dock layout?",
      message: `${shown}\n\nA restore point is saved first. To install apps, use the MacSync menu bar app.`,
      primaryAction: { title: "Apply", style: Alert.ActionStyle.Default },
    });
    if (!ok) return;
    await macsync("apply", "--yes");
    await showHUD("Dock updated. Use Undo Last Apply to go back.");
  } catch (e) {
    await showHUD(failure(e));
  }
}
