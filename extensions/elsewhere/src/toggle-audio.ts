import { toggleFromCurrentState } from "./toggle-state";

export default async function Command() {
  await toggleFromCurrentState({
    command: (snapshot) => ({
      kind: "experience",
      action: snapshot.playing ? "pause" : "play",
    }),
    successTitle: (snapshot) => (snapshot.playing ? "Audio Paused" : "Audio Playing"),
  });
}
