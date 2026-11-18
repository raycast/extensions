import { executeFromCurrentState } from "./state-gated-command";

export default async function Command() {
  await executeFromCurrentState({
    command: () => ({ kind: "volume", target: "music", delta: 10 }),
    successTitle: () => "Music Volume Increased",
  });
}
