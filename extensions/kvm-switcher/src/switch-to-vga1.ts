import { switchMonitorInput } from "./switch-util";

export default async function main() {
  await switchMonitorInput(1, "VGA 1");
}
