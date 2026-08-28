import { registerProvider } from "./registry";
import { musicProvider } from "../providers/music";
import { spotifyProvider } from "../providers/spotify";
import { chromeProvider, safariProvider } from "../providers/browser";

/** Idempotent: registry ignores duplicate ids. Call from every command entry point. */
export function registerAllProviders(): void {
  registerProvider(musicProvider);
  registerProvider(spotifyProvider);
  registerProvider(safariProvider);
  registerProvider(chromeProvider);
}
