import { executeFromCurrentState } from "./state-gated-command";

export default async function Command() {
  await executeFromCurrentState({
    command: (snapshot) => ({
      kind: "music",
      action: snapshot.backgroundMusicEnabled ? "off" : "on",
    }),
    successTitle: (snapshot) => (snapshot.backgroundMusicEnabled ? "Background Music Off" : "Background Music On"),
  });
}
