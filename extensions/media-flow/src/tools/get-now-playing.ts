import { getMediaSources } from "../core/mediaService";
import { registerAllProviders } from "../core/setup";

/** Returns the currently playing tracks. Used by Raycast AI. */
export default async function tool(): Promise<string> {
  registerAllProviders();
  const { sources } = await getMediaSources();
  if (sources.length === 0) return "Nothing is playing right now.";
  return sources
    .map(
      (s) =>
        `${s.isPlaying ? "▶" : "⏸"} "${s.title}" by ${s.artist ?? "unknown"} (${s.appName})${s.album ? ` from "${s.album}"` : ""}`,
    )
    .join("\n");
}
