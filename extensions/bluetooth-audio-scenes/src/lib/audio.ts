import { cmd } from "./exec";

export interface AudioDevice {
  name: string;
  id?: number;
  uid?: string;
}

export async function getCurrentOutputName(): Promise<string> {
  const out = await cmd("SwitchAudioSource", ["-c", "-t", "output"]);
  return out.trim();
}

export async function listOutputDevices(): Promise<AudioDevice[]> {
  const out = await cmd("SwitchAudioSource", ["-a", "-t", "output"]);
  return out
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((name) => ({ name }));
}

export async function setOutputByName(name: string): Promise<void> {
  await cmd("SwitchAudioSource", ["-s", name, "-t", "output"]);
}

function normalize(s: string): string {
  // Keep Unicode letters and numbers, not just ASCII
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

export async function findMatchingOutput(deviceName: string): Promise<string | undefined> {
  const outputs = await listOutputDevices();

  // 1) Exact match
  const exact = outputs.find((o) => o.name === deviceName);
  if (exact) {
    return exact.name;
  }

  // 2) Case-insensitive exact match
  const caseInsensitive = outputs.find((o) => o.name.toLowerCase() === deviceName.toLowerCase());
  if (caseInsensitive) {
    return caseInsensitive.name;
  }

  // 3) Fuzzy match (only if normalized needle is non-empty)
  const needle = normalize(deviceName);
  if (needle.length < 2) {
    return undefined; // too short to match reliably
  }

  const fuzzy = outputs.find((o) => {
    const h = normalize(o.name);
    if (h.length < 2) {
      return false;
    }
    return h.includes(needle) || needle.includes(h);
  });

  return fuzzy?.name;
}

export function hasMatchingOutput(deviceName: string, outputs: AudioDevice[]): boolean {
  // 1) Exact match
  if (outputs.some((o) => o.name === deviceName)) {
    return true;
  }

  // 2) Case-insensitive exact match
  if (outputs.some((o) => o.name.toLowerCase() === deviceName.toLowerCase())) {
    return true;
  }

  // 3) Fuzzy match
  const needle = normalize(deviceName);
  if (needle.length < 2) {
    return false;
  }

  return outputs.some((o) => {
    const h = normalize(o.name);
    if (h.length < 2) {
      return false;
    }
    return h.includes(needle) || needle.includes(h);
  });
}

// Volume control (0-100)
export async function getVolume(): Promise<number> {
  const out = await cmd("osascript", ["-e", "output volume of (get volume settings)"]);
  return Number.parseInt(out.trim(), 10);
}

export async function setVolume(level: number): Promise<void> {
  const clamped = Math.max(0, Math.min(100, Math.round(level)));
  await cmd("osascript", ["-e", `set volume output volume ${clamped}`]);
}

// Mute control
export async function isMuted(): Promise<boolean> {
  const out = await cmd("osascript", ["-e", "output muted of (get volume settings)"]);
  return out.trim() === "true";
}

export async function setMuted(muted: boolean): Promise<void> {
  await cmd("osascript", ["-e", `set volume output muted ${muted}`]);
}

// Input device control
export async function listInputDevices(): Promise<AudioDevice[]> {
  const out = await cmd("SwitchAudioSource", ["-a", "-t", "input"]);
  return out
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((name) => ({ name }));
}

export async function getCurrentInputName(): Promise<string> {
  const out = await cmd("SwitchAudioSource", ["-c", "-t", "input"]);
  return out.trim();
}

export async function setInputByName(name: string): Promise<void> {
  await cmd("SwitchAudioSource", ["-s", name, "-t", "input"]);
}
