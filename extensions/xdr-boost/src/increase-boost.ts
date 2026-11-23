import { runNoView } from "./lib/no-view";

export default async function Command() {
  await runNoView({ kind: "step", direction: 1 }, "Increasing XDR Boost", "XDR Boost Already at Max");
}
