import { openSerialPlotterUrl } from "./utils"

export default async function main() {
  await openSerialPlotterUrl("start", "Started Monitoring!")
}
