import { showHUD } from "@raycast/api";
import { CliMissingError, DAEMON_INSTALL, fanControl, read, setFans } from "./ougi";

// Any fan in manual mode means we forced it earlier, so hand control back; otherwise go to max.
export default async function () {
  try {
    const reading = await read();
    if (fanControl(reading) !== "ready") return showHUD(`Fan control not set up: run ${DAEMON_INSTALL}`);
    const toAuto = reading.fans.some((f) => f.manual);
    await setFans(toAuto ? "auto" : "max");
    await showHUD(toAuto ? "Fans: Auto" : "Fans: Max");
  } catch (e) {
    if (e instanceof CliMissingError) return showHUD("Install ougi first: brew install arturious/tap/ougi");
    await showHUD(`Fans: ${e instanceof Error ? e.message : String(e)}`);
  }
}
