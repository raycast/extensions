import { runCommand } from "./moment.ts";

export default async function Command() {
  await runCommand("pauseTimer");
}
