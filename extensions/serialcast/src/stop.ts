import { openSerialPlotterUrl } from "./utils"

export default async function main() {
  await openSerialPlotterUrl("stop", "Stopped Monitoring.")
}
