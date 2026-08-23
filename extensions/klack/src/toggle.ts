import { klack } from "./lib/klack";
import { runSilently } from "./lib/run-silently";

export default async function Command() {
  await runSilently(async () => {
    const enabled = await klack.toggle();
    return enabled ? "Klack enabled" : "Klack disabled";
  });
}
