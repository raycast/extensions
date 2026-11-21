import { runCopyCommand } from "./lib/run";

export default async function Command() {
  await runCopyCommand("markdown", "copy");
}
