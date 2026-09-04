import { sendCommand } from "./kuando";

export default async function main() {
  await sendCommand("action=light&green=100", "🟢 Busylight: Available");
}
