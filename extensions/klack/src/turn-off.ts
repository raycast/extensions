import { klack } from "./lib/klack";
import { runSilently } from "./lib/run-silently";

export default async function Command() {
  await runSilently(async () => {
    if (!(await klack.isEnabled())) return "Klack is already off";
    await klack.turnOff();
    return "Klack disabled";
  });
}
