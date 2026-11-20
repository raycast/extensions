import { act } from "../lib/client";

type Input = {
  /** true to mute the microphone, false to unmute it. */
  muted: boolean;
};

export default async function tool({ muted }: Input) {
  const s = await act({ cmd: "mute", action: muted ? "on" : "off" });
  return s.muted ? "Microphone muted." : "Microphone unmuted.";
}
