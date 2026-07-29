import { executeElsewhereCommand } from "./command-runner";

export default async function Command() {
  await executeElsewhereCommand(
    { kind: "volume", target: "music", delta: 10 },
    { successTitle: "Music Volume Increased" },
  );
}
