import { BUILT_IN_ACTIONS, isBuiltIn, isDictate, isKey, KEYS, MODIFIERS } from "./bindings.ts";
import type { Target } from "./bindings.ts";

// Presentation helpers for the Configure Wave Buttons screen, kept free of
// Raycast imports so they can be tested with node:test.

const titleCase = (slug: string) =>
  slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

/** A compact label for what a binding does. */
export function shortTarget(binding: Target): string {
  if (isBuiltIn(binding)) return BUILT_IN_ACTIONS.find((a) => a.id === binding.command)?.title ?? binding.command;
  if (isDictate(binding)) {
    const label = binding.submit ? "Dictate & Send" : "Dictate as Draft";
    return binding.app ? `${label} → ${binding.app.name}` : label;
  }
  if (isKey(binding)) {
    const mods = MODIFIERS.filter((m) => binding.modifiers?.includes(m.id))
      .map((m) => m.symbol)
      .join("");
    return `Key ${mods}${KEYS.find((k) => k.id === binding.key)?.symbol ?? binding.key}`;
  }
  // raycast://extensions/<owner>/<extension>/<command> → "Extension › Command"
  const m = /^raycast:\/\/extensions\/[^/]+\/([^/?#]+)\/([^/?#]+)/.exec(binding.url);
  return m ? `${titleCase(m[1])} › ${titleCase(m[2])}` : binding.url;
}

export type RingState =
  | "connected"
  | "unresponsive"
  | "disconnected"
  | "searching"
  | "bluetoothOff"
  | "bluetoothDenied"
  | "forgotten"
  | "oldFirmware"
  | "unknown";

/** Latest connection state, from the helper's listener log. */
export function ringState(log: string): RingState {
  const lines = log.trimEnd().split("\n").reverse();
  for (const line of lines) {
    if (line.includes("but not responding")) return "unresponsive";
    if (line.includes("Bluetooth is off")) return "bluetoothOff";
    if (line.includes("Bluetooth permission denied")) return "bluetoothDenied";
    if (line.includes("skipping forgotten Wave")) return "forgotten";
    if (line.includes("has no Wave API")) return "oldFirmware";
    if (line.includes('"event":"connected"')) return "connected";
    if (line.includes('"event":"disconnected"')) return "disconnected";
    if (line.includes("scanning for Wave") || line.includes("using already connected")) return "searching";
    // The start of the listener's current run: anything earlier is from before a restart.
    if (line.includes("wave-helper: bindings:")) return "searching";
  }
  return "unknown";
}

export function readingAge(updatedAt: string | undefined, now: number): string | undefined {
  if (!updatedAt) return undefined;
  const minutes = Math.floor((now - Date.parse(updatedAt)) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.floor(minutes / 60)} h ago`;
}

/**
 * What to tell someone whose ring isn't connected yet, e.g. on first run;
 * no title means nothing to show.
 */
export function onboarding(input: { running: boolean; trouble?: string; ring?: RingState }): {
  title?: string;
  subtitle?: string;
} {
  if (input.trouble) {
    return {
      title: "Wave's background helper isn't running",
      subtitle: `${input.trouble}; Copy Diagnostics and send them to Genki`,
    };
  }
  if (!input.running) return { title: "Starting Wave…", subtitle: "Starting the background listener" };
  if (input.ring === "connected") return {};
  if (input.ring === "bluetoothDenied") {
    return {
      title: "Allow wave-helper to use Bluetooth",
      subtitle: "System Settings → Privacy & Security → Bluetooth, then reopen",
    };
  }
  if (input.ring === "forgotten") {
    return { title: "You forgot the Wave that's nearby", subtitle: "Choose it again to use it with this Mac" };
  }
  if (input.ring === "oldFirmware") {
    return { title: "Your Wave's firmware is too old", subtitle: "Update it with Softwave, then quit Softwave" };
  }
  if (input.ring === "bluetoothOff") {
    return { title: "Bluetooth is off", subtitle: "Turn on Bluetooth to connect your Wave" };
  }
  if (input.ring === "unresponsive") {
    return {
      title: "Your Wave is connected but not responding",
      subtitle: "Turn it off and on (hold top and bottom, then press middle)",
    };
  }
  return {
    title: "Looking for your Wave…",
    subtitle: "Press the middle button to turn it on, and keep it close to this Mac",
  };
}

export type Fix =
  | "reinstallListener"
  | "startListener"
  | "enableBluetooth"
  | "bluetoothSettings"
  | "updateFirmware"
  | "restartListener"
  | "chooseWave";

/** The one action that gets the user out of a state, for both Configure Wave and the menu bar. */
export function fixFor(input: {
  running: boolean;
  trouble?: string;
  ring?: RingState;
}): { fix: Fix; title: string } | undefined {
  if (input.trouble) return { fix: "reinstallListener", title: "Reinstall Listener" };
  if (!input.running) return { fix: "startListener", title: "Start Wave" };
  switch (input.ring) {
    case "bluetoothOff":
      return { fix: "enableBluetooth", title: "Enable Bluetooth" };
    case "bluetoothDenied":
      return { fix: "bluetoothSettings", title: "Open Bluetooth Settings" };
    case "oldFirmware":
      return { fix: "updateFirmware", title: "Open Softwave" };
    case "unresponsive":
      return { fix: "restartListener", title: "Reconnect" };
    case "forgotten":
      return { fix: "chooseWave", title: "Choose Wave…" };
    default:
      return undefined;
  }
}

/**
 * Identify through the listener is a signal with no reply, so check first that it
 * has a ring to flash.
 */
export function identifyProblem(input: { running: boolean; ring?: RingState }): string | undefined {
  if (input.running && input.ring !== "connected") return "Your Wave isn't connected";
  return undefined;
}

/** For a battery reading the listener took on an earlier connection. */
export function staleReading(input: {
  running: boolean;
  ring?: RingState;
  updatedAt?: string;
  now: number;
}): string | undefined {
  if (!input.running || input.ring === "connected") return undefined;
  const age = readingAge(input.updatedAt, input.now);
  return age ? `Not connected · last reading ${age}` : "Not connected";
}

/**
 * Why launchd can't keep the helper running, if it can't. The helper exits 1 on
 * purpose (e.g. Bluetooth off) and launchd starts it again; anything else is trouble.
 */
export function listenerTrouble(agent: { state?: string; lastExit?: string }): string | undefined {
  if (agent.state === "running" || !agent.lastExit) return undefined;
  const code = agent.lastExit.split(":")[0].trim();
  if (code === "0" || code === "1") return undefined;
  if (code === "78") return "macOS can't start the helper (EX_CONFIG)";
  return `The helper keeps stopping (exit ${agent.lastExit})`;
}
