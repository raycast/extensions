import { switchMonitorInput } from "./switch-util";

export default async function main() {
  await switchMonitorInput(15, "DisplayPort 1");
}
