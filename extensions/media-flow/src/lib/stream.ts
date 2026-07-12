import { spawn } from "node:child_process";
import { MEDIA_CONTROL_BIN } from "../providers/mediaControl";

export interface StreamHandle {
  stop: () => void;
}

/**
 * Subscribe to `media-control stream` and invoke `onChange` once per emitted update.
 *
 * media-control only emits when the now-playing state actually changes (track, play/pause,
 * app) — not on elapsed-time ticks — and coalesces bursts via its own `--debounce`. So
 * `onChange` is a low-frequency, event-driven signal to refresh the menu, with no polling.
 * The payload is ignored here; the caller re-reads the merged snapshot instead, which keeps
 * the multi-provider merge and artwork caching in one place.
 *
 * Never throws. If the process fails to spawn or the stream dies, `onError` fires (once) so
 * the caller can degrade to polling. Killing it via `stop()` does NOT count as an error.
 */
export function streamNowPlaying(
  onChange: () => void,
  onError?: () => void,
): StreamHandle {
  let stopped = false;
  let child: ReturnType<typeof spawn>;
  try {
    child = spawn(
      MEDIA_CONTROL_BIN,
      ["stream", "--no-artwork", "--debounce=200"],
      { stdio: ["ignore", "pipe", "ignore"] },
    );
  } catch {
    onError?.();
    return { stop: () => {} };
  }

  let buf = "";
  child.stdout?.setEncoding("utf8");
  child.stdout?.on("data", (chunk: string) => {
    buf += chunk;
    // Emit once per complete newline-delimited JSON line; each line is one update.
    let nl = buf.indexOf("\n");
    while (nl !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line) onChange();
      nl = buf.indexOf("\n");
    }
  });
  child.on("error", () => {
    if (!stopped) onError?.();
  });
  child.on("exit", () => {
    if (!stopped) onError?.();
  });

  return {
    stop: () => {
      stopped = true;
      try {
        child.kill();
      } catch {
        // already exited
      }
    },
  };
}
