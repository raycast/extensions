import { switchMonitorInput } from "./switch-util";

export default async function main() {
  await switchMonitorInput(17, "HDMI 1");
}
