import { sendCommand } from "./kuando";

export default async function main() {
  await sendCommand("action=off", "⚪ Busylight: Off");
}
