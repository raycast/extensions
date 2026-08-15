import { getPreferenceValues } from "@raycast/api";
import { discoverBinary, makeCli, RitualCliError, type Cli } from "./api/cli";

/// The shape of these comes from `raycast-env.d.ts`, which Raycast generates
/// from package.json's `preferences` — `Preferences` is an ambient global, so
/// there is nothing to import and nothing to keep in step. A hand-written copy
/// used to sit here; it was a second declaration of the same manifest that a
/// new preference would silently leave behind.
export type QuickCaptureDestination = Preferences["quickCaptureDestination"];

/// The seam between Raycast and the api layer. Nothing under `api/` reads
/// preferences, which is what lets vitest exercise it without the Raycast
/// runtime — so this is the one place `@raycast/api` and `Cli` meet.
export function resolveCli(): Cli {
  const bin = discoverBinary(getPreferenceValues<Preferences>().cliPath);
  if (!bin) {
    throw new RitualCliError(
      "Ritual's command-line tool wasn't found. Install the Ritual Mac app, or set its path in this extension's preferences.",
      "missing",
    );
  }
  return makeCli(bin);
}

export function quickCaptureDestination(): QuickCaptureDestination {
  return getPreferenceValues<Preferences>().quickCaptureDestination ?? "inbox";
}

/// How many days out a deadline starts reading as urgent.
///
/// A PREFERENCE, not a value read from the app. The iPhone's own setting lives
/// in that app's `UserDefaults.standard` — not the shared App Group, and not
/// synced anywhere — so nothing on this Mac can see it, the CLI included.
/// Mirroring the app's default (7) and letting it be changed here is the honest
/// version of "follows your setting"; silently hardcoding 7 was not.
///
/// A blank, non-numeric or non-positive entry falls back to the default rather
/// than colouring every deadline or none: a preference field is free text, and
/// the failure should be inert.
export function deadlineLeadDays(): number {
  const raw = getPreferenceValues<Preferences>().deadlineLeadDays;
  const parsed = Number.parseInt((raw ?? "").trim(), 10);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_DEADLINE_LEAD_DAYS;
}

/// `AppSettings.Default.deadlineLeadDays` in the app repo.
export const DEFAULT_DEADLINE_LEAD_DAYS = 7;
