import { getState } from "../lib/client";

export default async function tool() {
  const s = await getState();
  return {
    activeScene: s.scenes.find((x) => x.active)?.name ?? null,
    reason: s.manual ? "chosen by hand" : (s.reason ?? null),
    automation: s.paused ? "paused" : s.automationEnabled ? "on" : "off",
    microphoneMuted: s.muted,
    microphone: s.inputs.find((d) => d.current)?.name ?? null,
    speakers: s.outputs.find((d) => d.current)?.name ?? null,
    volumePercent: s.volume === undefined ? null : Math.round(s.volume * 100),
    scenes: s.scenes.map((x) => ({
      name: x.name,
      when: x.summary,
      wouldUseMicrophone: x.input ?? null,
      wouldUseSpeakers: x.output ?? null,
    })),
  };
}
