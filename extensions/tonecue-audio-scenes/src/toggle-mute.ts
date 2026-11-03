import { act } from "./lib/client";
import { runCommand } from "./lib/ui";

export default async function Command() {
  await runCommand(async () =>
    (await act({ cmd: "mute", action: "toggle" })).muted ? "Microphone muted" : "Microphone on",
  );
}
