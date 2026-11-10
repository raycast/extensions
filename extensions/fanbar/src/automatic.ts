import { showHUD } from "@raycast/api";
import { asFanBarError, runFanBar } from "./lib/fanbar";

export default async function Automatic() {
  try {
    const reply = await runFanBar(["mode", "auto"]);
    await showHUD(reply.message || "Automatic (macOS)");
  } catch (error) {
    const failure = asFanBarError(error);
    await showHUD(`${failure.title}: ${failure.message}`);
  }
}
