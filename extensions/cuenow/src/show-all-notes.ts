import { runCueNowCommand } from "./cuenow";

export default async function Command(): Promise<void> {
  await runCueNowCommand("show-all-notes");
}
