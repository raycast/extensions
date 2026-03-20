import { switchMonitorInput } from "./switch-util";

export default async function main() {
  await switchMonitorInput(16, "DisplayPort 2");
}
