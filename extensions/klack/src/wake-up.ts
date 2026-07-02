import { klack } from "./lib/klack";
import { runSilently } from "./lib/run-silently";

export default async function Command() {
  await runSilently(async () => {
    if (!(await klack.isSleeping())) return "Klack is already awake";
    await klack.wakeUp();
    return "Klack woken up";
  });
}
