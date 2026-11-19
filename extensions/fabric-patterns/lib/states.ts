// fabric's failures, mapped to plain-language states (ISC-38). The stderr texts were
// captured from fabric 1.4.518 and in manual testing; anything unrecognised falls back to `failed`,
// whose description is fabric's own first lines when the caller passes them.

import { DEFAULT_FABRIC_PATH } from "./paths";
import { shellCommand } from "./result";

export type StateId =
  | "fabric-missing"
  | "no-model"
  | "no-patterns"
  | "nothing-selected"
  | "youtube-background"
  | "bad-key"
  | "pinned-gone"
  | "pinned-chain-gone"
  | "cant-see-pattern"
  | "couldnt-paste"
  | "youtube-rate-limit"
  | "spotify-setup"
  | "failed";

export type StateAction =
  "open-preferences" | "copy-setup" | "download-patterns" | "configure" | "copy-command" | "unpin" | "none";

export interface State {
  id: StateId;
  title: string;
  description: string;
  action: StateAction;
  /** The fabric path may be wrong even though something ran, so the state also offers Preferences. */
  pathSuspect?: true;
  /** What Copy Setup Command copies, on the copy-setup states: the Fabric Path's own --setup. */
  setupCommand?: string;
}

/** The first two non-empty lines of fabric's error, each cut to 200 characters. */
function errorLines(error?: string): string {
  return (error ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((l) => (l.length > 200 ? `${l.slice(0, 199)}…` : l))
    .join("\n");
}

export function stateFor(id: StateId, detail: { fabricPath?: string; pattern?: string; error?: string } = {}): State {
  // Homebrew installs fabric as fabric-ai, so a bare `fabric --setup` may not run at all.
  const setup = shellCommand(detail.fabricPath ?? DEFAULT_FABRIC_PATH, ["--setup"]);
  const s: Record<StateId, Omit<State, "id">> = {
    "fabric-missing": {
      title: "fabric not found",
      description: `Nothing at ${detail.fabricPath ?? "the path in Preferences"}. Install it with brew install fabric-ai: the default setting finds /opt/homebrew/bin/fabric-ai or, on an Intel Mac, /usr/local/bin/fabric-ai. Installed somewhere else? Set the path in Preferences.`,
      action: "open-preferences",
    },
    "no-model": {
      title: "No default model",
      description: `fabric doesn't have a model set yet. Run ${setup} in a terminal once.`,
      action: "copy-setup",
    },
    "no-patterns": {
      title: "No patterns installed",
      description: "fabric is installed but has no patterns yet.",
      action: "download-patterns",
      // A path to anything that exits 0 and prints nothing (e.g. /usr/bin/true) lands here too.
      pathSuspect: true,
    },
    "nothing-selected": {
      title: "Nothing selected, clipboard empty",
      description:
        "Select or copy some text, or press ⌘↵ to give a URL or file. (No selection can also mean Raycast lacks Accessibility permission.)",
      action: "configure",
    },
    "youtube-background": {
      title: "Running in the background",
      description: "Videos take a while. A notification says when it's done; see Show Background Runs.",
      action: "none",
    },
    "bad-key": {
      title: "Model refused the key",
      description: `The provider says the key is missing or wrong. Fix it with ${setup}.`,
      action: "copy-command",
    },
    "pinned-gone": {
      title: "Pinned pattern is gone",
      description: `"${detail.pattern ?? "This pattern"}" no longer exists. A pattern update may have removed it.`,
      action: "unpin",
    },
    "pinned-chain-gone": {
      title: "Pinned chain is gone",
      description: `"${detail.pattern ?? "This chain"}" is no longer in your chains folder.`,
      action: "unpin",
    },
    "cant-see-pattern": {
      title: "Saved, but fabric can't see it",
      description: `fabric isn't set to read your Custom Patterns folder. Run ${setup} › Custom Patterns.`,
      action: "copy-setup",
    },
    "couldnt-paste": {
      title: "Couldn't paste",
      description: "The app you started in isn't in front any more. The result was copied instead.",
      action: "none",
    },
    "youtube-rate-limit": {
      title: "YouTube is rate-limiting you",
      description: "YouTube refused the transcript download for now. Try again in a few minutes.",
      action: "none",
    },
    "spotify-setup": {
      title: "Spotify isn't set up",
      description: `fabric needs a Spotify client ID and secret. Run ${setup} in a terminal and fill in Spotify.`,
      action: "copy-setup",
    },
    failed: {
      title: "fabric failed",
      description: errorLines(detail.error) || "fabric exited with an error.",
      action: "copy-command",
      pathSuspect: true,
    },
  };
  return s[id].action === "copy-setup" ? { id, ...s[id], setupCommand: setup } : { id, ...s[id] };
}

/** Which state a failed run is in, from what fabric printed (or the spawn error). */
export function classifyFailure(stderr: string, spawnError?: string): StateId {
  const t = `${stderr}\n${spawnError ?? ""}`;
  if (/ENOENT|EACCES|no such file or directory.*fabric/i.test(spawnError ?? "")) return "fabric-missing";
  // fabric 1.4.518: "error getting Spotify metadata: Spotify is not configured, please run the setup procedure".
  if (/spotify is not configured/i.test(t)) return "spotify-setup";
  if (
    /error loading \.env file|please run 'fabric --setup'|select default model and vendor|no (default )?model/i.test(t)
  )
    return "no-model";
  if (
    /\b401\b|unauthori[sz]ed|invalid[ _-]?(x-)?api[ _-]?key|incorrect api key|authentication_error|api key not valid|permission_denied/i.test(
      t,
    )
  )
    return "bad-key";
  if (/youtube rate limit|HTTP Error 429|too many requests/i.test(t)) return "youtube-rate-limit";
  return "failed";
}
