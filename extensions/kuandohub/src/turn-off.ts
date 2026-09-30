import { sendCommand } from "./kuando";

export default async function main() {
  // action=off would only log out the HTTP source, letting a lower-priority
  // source (e.g. a manual color) take over — all-zero light means actually dark.
  await sendCommand("action=light&red=0&green=0&blue=0", "⚪ Busylight: Off");
}
