import { executeFromCurrentState } from "./state-gated-command";

export default async function Command() {
  await executeFromCurrentState({
    command: () => ({ kind: "volume", target: "ambience", delta: -10 }),
    successTitle: () => "Ambience Volume Decreased",
  });
}
