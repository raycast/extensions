import { runTrellisCommand } from "./lib/trellis";

export default async function Command() {
  await runTrellisCommand("neighbour?dir=right");
}
