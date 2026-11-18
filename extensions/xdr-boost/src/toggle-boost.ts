import { defaultLevel } from "./lib/control";
import { runNoView } from "./lib/no-view";

export default async function Command() {
  await runNoView({ kind: "toggle", level: defaultLevel() }, "Toggling XDR Boost");
}
