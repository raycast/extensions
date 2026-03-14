import { runTrimCommand } from "./trim-core";

export default async function command(): Promise<void> {
  await runTrimCommand("copy");
}
