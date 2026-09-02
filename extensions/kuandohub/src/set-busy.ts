import { sendCommand } from "./kuando";

export default async function main() {
  await sendCommand("action=light&red=100", "🔴 Busylight: Busy");
}
