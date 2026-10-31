import { run } from "./notchwake";

export default async function Command() {
  await run("timer/stop", {}, "Timer stopped");
}
