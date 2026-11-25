import { runControl } from "./lib/feedback";

export default async function Command() {
  await runControl(["screenshot", "--pick"], {
    changed: null,
    off: "Turn on Labs › Screenshots in Hex first",
  });
}
