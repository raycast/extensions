import { environment } from "@raycast/api";
import { getPreferences } from "./preferences";

/**
 * Opt-in, anonymous usage telemetry.
 *
 * Gated by the `telemetryEnabled` preference (default OFF). Events carry only
 * lengths/counts/enums — never query text, names, emails, or any PII. The
 * transport is intentionally a thin seam: today events are recorded to the
 * extension's debug log; a future build can point {@link send} at a first-party
 * proxy (e.g. PostHog) without touching call sites. See PRD §10.
 */
export type TelemetryEvent =
  | { name: "extension_installed"; version: string }
  | { name: "oauth_connect_started" }
  | { name: "oauth_connect_completed" }
  | { name: "oauth_connect_failed"; reason: string }
  | { name: "token_refreshed" }
  | { name: "token_refresh_failed" }
  | { name: "command_opened"; command_name: string }
  | { name: "list_viewed"; command_name: string; result_count: number; page: number }
  | { name: "search_executed"; command_name: string; query_length: number; result_count: number; latency_ms: number }
  | { name: "item_created"; has_contact: boolean; has_category: boolean }
  | { name: "contact_created" }
  | { name: "detail_viewed"; entity_type: string }
  | { name: "open_in_web_app"; entity_type: string }
  | { name: "error_occurred"; command_name: string; http_status: number; code?: string }
  | { name: "signed_out" };

export function track(event: TelemetryEvent): void {
  try {
    if (!getPreferences().telemetryEnabled) return;
    send(event);
  } catch {
    // Telemetry must never break a command.
  }
}

function send(event: TelemetryEvent): void {
  // Seam for a real destination. Kept side-effect-free beyond logging so the
  // opt-in default stays truly no-network.
  if (environment.isDevelopment) {
    console.debug("[telemetry]", JSON.stringify(event));
  }
}
