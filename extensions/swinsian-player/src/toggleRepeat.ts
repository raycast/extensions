import { showHUD } from "@raycast/api";
import { cycleRepeat } from "./helpers/swinsian";

export default async function ToggleRepeat() {
  const next = await cycleRepeat();
  const labels: Record<string, string> = { off: "Off", queue: "Repeat Queue", single: "Repeat One" };
  await showHUD(`Repeat: ${labels[next] ?? next}`);
}
