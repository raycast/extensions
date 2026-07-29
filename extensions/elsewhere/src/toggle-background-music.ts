import { toggleFromCurrentState } from "./toggle-state";

export default async function Command() {
  await toggleFromCurrentState({
    command: (snapshot) => ({
      kind: "music",
      action: snapshot.backgroundMusicEnabled ? "off" : "on",
    }),
    successTitle: (snapshot) => (snapshot.backgroundMusicEnabled ? "Background Music Off" : "Background Music On"),
  });
}
