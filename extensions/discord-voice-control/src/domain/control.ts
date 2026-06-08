import type { VoiceAction, VoiceControlResult } from "./types";

/**
 * The shared control interface every Discord control mechanism must implement. The application
 * layer depends only on this — never on AppleScript/shell/UI-automation details. MVP has a single
 * implementation (the shortcut adapter); the placeholder adapter implements it too so the command
 * surface returns typed results before real automation exists.
 */
export interface DiscordController {
  /** A human-readable name for diagnostics, e.g. "shortcut" or "placeholder". */
  readonly name: string;

  /**
   * Attempt a voice action. Implementations must return a typed {@link VoiceControlResult} for
   * every *expected* operational outcome (success/unavailable/failed/unknown) rather than throwing.
   * Thrown exceptions are reserved for truly unexpected/programmer errors and are normalized to an
   * `unexpectedError` result by the application layer.
   */
  perform(action: VoiceAction): Promise<VoiceControlResult>;
}
