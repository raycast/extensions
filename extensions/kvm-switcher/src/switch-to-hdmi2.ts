import { switchMonitorInput } from "./switch-util";

export default async function main() {
  await switchMonitorInput(18, "HDMI 2");
}
