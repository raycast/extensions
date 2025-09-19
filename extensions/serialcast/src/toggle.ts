import { openSerialPlotterUrl } from "./utils"

export default async function main() {
  await openSerialPlotterUrl("toggle", "Toggled Monitoring.")
}
