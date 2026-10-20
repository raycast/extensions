import { client, perform } from "./shared";
export default async function Command() {
  await perform("Stop all timers", () => client().stopAll());
}
