import { showHUD } from "@raycast/api";
import { failure, macsync } from "./run";

export default async function Command() {
  try {
    const lines = (await macsync("outdated")).split("\n").filter((line) => line.trim());
    if (lines.length === 1 && lines[0].startsWith("Everything")) {
      await showHUD("Homebrew: everything is up to date");
    } else {
      const names = lines.map((line) => line.split(":")[0]);
      await showHUD(`${lines.length} to update: ${names.slice(0, 4).join(", ")}${names.length > 4 ? "…" : ""}`);
    }
  } catch (e) {
    await showHUD(failure(e));
  }
}
