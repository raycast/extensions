import { executeElsewhereCommand } from "./command-runner";

export default async function Command() {
  await executeElsewhereCommand(
    { kind: "volume", target: "ambience", delta: 10 },
    { successTitle: "Ambience Volume Increased" },
  );
}
