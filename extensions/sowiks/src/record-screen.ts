import { runSowiksCommand } from "./lib/sowiks";

export default async function Command() {
  await runSowiksCommand("record-screen");
}
