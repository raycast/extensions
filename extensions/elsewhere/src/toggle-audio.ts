import { executeFromCurrentState } from "./state-gated-command";

export default async function Command() {
  await executeFromCurrentState({
    command: (snapshot) => ({
      kind: "experience",
      action: snapshot.playing ? "pause" : "play",
    }),
    successTitle: (snapshot) => (snapshot.playing ? "Audio Paused" : "Audio Playing"),
  });
}
