import type { DiscordController } from "../../domain/control";
import { buildResult } from "../../domain/result";
import type { ReasonCode, VoiceAction, VoiceControlResult } from "../../domain/types";
import {
  classifyOsascriptError,
  type OsascriptResult,
  type RunOsascriptOptions,
} from "../system/osascript";
import { DISCORD_APP_NAME } from "../system/discord-probe";
import { parseShortcut, type ParsedShortcut } from "../system/shortcut-parser";

/**
 * The sole MVP control mechanism (Phase 4). Activates Discord, dispatches the configured in-app
 * keybind, then restores the user's previous frontmost app. Best-effort: a no-error dispatch is
 * reported as success with "sent" wording — it never asserts a resulting voice state.
 *
 * All shell/AppleScript stays inside this adapter; the application layer sees only typed results.
 * Dependencies are injected so the contract can be exercised with a mocked osascript runner.
 */

export interface ShortcutControllerDeps {
  /** Resolve the configured combo string (e.g. "cmd+shift+m") for an action. */
  readonly getShortcut: (action: VoiceAction) => string;
  /** Returns true if Discord is currently running. */
  readonly isDiscordRunning: () => Promise<boolean>;
  /** Runs osascript `-e` lines; never throws for script errors. */
  readonly runOsascript: (
    lines: readonly string[],
    options: RunOsascriptOptions,
  ) => Promise<OsascriptResult>;
  /** Read the frontmost app name to restore focus afterward (empty string if unknown). */
  readonly getFrontmostApp: () => Promise<string>;
  /** Dispatch timeout in milliseconds. */
  readonly timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 4000;
const ACTIVATE_DELAY = 0.35;
const POST_KEY_DELAY = 0.2;

export class ShortcutController implements DiscordController {
  readonly name = "shortcut";

  constructor(private readonly deps: ShortcutControllerDeps) {}

  async perform(action: VoiceAction): Promise<VoiceControlResult> {
    const startedAt = Date.now();
    const timeoutMs = this.deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    // --- Prerequisite 1: shortcut must parse (else unavailable, actionable). ---
    const combo = this.deps.getShortcut(action);
    const parsed = parseShortcut(combo);
    if (!parsed.ok) {
      return this.fail(action, "unavailable", "shortcutNotConfigured", {
        detail: `invalid shortcut: ${parsed.reason}`,
        errorCategory: "shortcutNotEffective",
        startedAt,
      });
    }

    // --- Prerequisite 2: Discord must be running (else unavailable, before dispatch). ---
    if (!(await this.deps.isDiscordRunning())) {
      return this.fail(action, "unavailable", "discordNotRunning", {
        detail: "discord process not detected",
        errorCategory: "discordNotRunning",
        startedAt,
      });
    }

    // --- Record focus so we can restore it after the brief Discord flash. ---
    const previousApp = (await this.deps.getFrontmostApp()).trim();

    // --- Single dispatch attempt (no uncontrolled retries). ---
    const dispatch = await this.deps.runOsascript(buildDispatchScript(parsed.shortcut), {
      timeoutMs,
    });

    // --- Restore focus regardless of dispatch outcome, if we know the previous app. ---
    if (previousApp && previousApp !== DISCORD_APP_NAME) {
      await this.deps.runOsascript([`tell application "${previousApp}" to activate`], {
        timeoutMs,
      });
    }

    if (dispatch.ok) {
      return buildResult({
        action,
        mechanism: "shortcut",
        outcome: "success",
        reasonCode: "shortcutDispatched",
        diagnostics: {
          detail: "keystroke dispatched without error",
          durationMs: Date.now() - startedAt,
        },
      });
    }

    // --- Normalize dispatch errors into stable reason codes. ---
    const kind = classifyOsascriptError(dispatch);
    const reasonCode: ReasonCode =
      kind === "permission"
        ? "accessibilityPermissionMissing"
        : kind === "timeout"
          ? "dispatchTimedOut"
          : "dispatchError";
    return this.fail(action, "failed", reasonCode, {
      detail: sanitizeError(dispatch),
      errorCategory: kind === "permission" ? "missingPermission" : "shortcutNotEffective",
      startedAt,
    });
  }

  private fail(
    action: VoiceAction,
    outcome: "failed" | "unavailable",
    reasonCode: ReasonCode,
    opts: {
      detail: string;
      errorCategory: NonNullable<VoiceControlResult["diagnostics"]>["errorCategory"];
      startedAt: number;
    },
  ): VoiceControlResult {
    return buildResult({
      action,
      mechanism: outcome === "unavailable" ? "none" : "shortcut",
      outcome,
      reasonCode,
      diagnostics: {
        detail: opts.detail,
        errorCategory: opts.errorCategory,
        durationMs: Date.now() - opts.startedAt,
      },
    });
  }
}

/**
 * Build the activate → keystroke → settle AppleScript. The key is a single validated character and
 * modifiers are from a fixed set, so there is nothing to inject.
 */
export function buildDispatchScript(shortcut: ParsedShortcut): string[] {
  const modifierList = shortcut.modifiers.join(", ");
  return [
    `tell application "${DISCORD_APP_NAME}" to activate`,
    `delay ${ACTIVATE_DELAY}`,
    `tell application "System Events" to keystroke "${shortcut.key}" using {${modifierList}}`,
    `delay ${POST_KEY_DELAY}`,
  ];
}

/** Reduce raw osascript output to a short sanitized note for diagnostics (never user-facing). */
function sanitizeError(result: OsascriptResult): string {
  if (result.timedOut) {
    return "osascript timed out";
  }
  // Keep only the first line and cap length so logs stay tidy and free of incidental detail.
  const firstLine = result.stderr.split("\n")[0] ?? "";
  return firstLine.slice(0, 200);
}
