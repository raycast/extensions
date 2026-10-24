import { client, perform } from "./shared";
export default async function Command() {
  await perform("timer:stop-all", "Stop all timers", () => client().stopAll());
}
