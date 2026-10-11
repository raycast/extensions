import { sanitize } from "./exec";
import { SwitchRequest, SwitchResult } from "./model";

// Text for reporting a finished switch from the no-view worker: a one-line HUD for menu-bar launches (the list
// reports its own switches from the operation record), plus toast-shaped title and message. Pure so it runs in
// plain Node tests.

export const UNKNOWN_HUD = "Switch outcome unknown — check the list before trying again";

const HUD_MAX = 200;

export interface SwitchReport {
  /** Toast title. */
  title: string;
  /** Toast body: the full sanitized message, plus the warning when the message does not already carry it. */
  message: string;
  /** Single-line HUD. A warning leads it, since a HUD is short and the warning is what needs acting on. */
  hud: string;
  /** Show as a failure: failed, unknown, or anything carrying a warning. */
  failure: boolean;
}

function sentence(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

export function switchReport(req: SwitchRequest, result: SwitchResult): SwitchReport {
  const label = sanitize(req.targetLabel, 80) || "the account";
  const message = sanitize(result.message, 600);
  const warning = sanitize(result.warning, 300);
  let title: string;
  let hud: string;
  switch (result.state) {
    case "succeeded":
      title = "Switch finished";
      hud = message || `Switched to ${label}`;
      break;
    case "noop":
      title = "Already active";
      hud = message || `${label} is already active`;
      break;
    case "handoff":
      title = "Continue in CodexBar";
      hud = message || "Finish the switch in CodexBar";
      break;
    case "failed":
      title = "Switch failed";
      hud = message ? `Switch failed: ${message}` : "Switch failed";
      break;
    default:
      title = "Switch outcome unknown";
      hud = message ? `Switch outcome unknown: ${message}` : UNKNOWN_HUD;
  }
  if (warning) hud = `${title}. ${warning}`;
  let body = message || title;
  if (warning && !body.includes(warning)) body = `${sentence(body)} ${warning}`;
  return {
    title,
    message: body,
    hud: sanitize(hud, HUD_MAX),
    failure: result.state === "failed" || result.state === "unknown" || warning !== "",
  };
}
