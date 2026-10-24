import { Color, Icon } from "@raycast/api";
import type { BouncerReason, BouncerStatus, DomainRecord, EmailRecord, Flag } from "./bouncer";

/**
 * Presentation only. Everything here relabels or formats what Bouncer returned — nothing
 * infers a verdict the API did not give, and nothing states a consequence it did not
 * establish. Domain responses carry no status at all, so no summary is invented for them.
 */

export type Verdict = {
  label: string;
  color: Color;
  icon: Icon;
};

/** A direct relabel of Bouncer's `status`, which is their conclusion and not ours. */
export function getVerdict(status: BouncerStatus | undefined): Verdict {
  switch (status) {
    case "deliverable":
      return { label: "Deliverable", color: Color.Green, icon: Icon.CheckCircle };
    case "risky":
      return { label: "Risky", color: Color.Orange, icon: Icon.Warning };
    case "undeliverable":
      return { label: "Undeliverable", color: Color.Red, icon: Icon.XMarkCircle };
    default:
      return { label: "Unknown", color: Color.SecondaryText, icon: Icon.QuestionMarkCircle };
  }
}

/** Bouncer's reason codes, in the words their documentation uses for them. */
export function formatReason(reason: BouncerReason | undefined): string {
  switch (reason) {
    case "accepted_email":
      return "Accepted by mail server";
    case "low_deliverability":
      return "Low deliverability";
    case "low_quality":
      return "Low quality address";
    case "invalid_email":
      return "Invalid email syntax";
    case "invalid_domain":
      return "Invalid or missing domain";
    case "rejected_email":
      return "Rejected by mail server";
    case "dns_error":
      return "DNS error";
    case "unavailable_smtp":
      return "Mail server unavailable";
    case "unsupported":
      return "Provider not supported";
    case "timeout":
      return "Verification timed out";
    case "unknown":
      return "Unknown error";
    default:
      return "Not reported";
  }
}

export function formatFlag(flag: Flag | undefined): string {
  switch (flag) {
    case "yes":
      return "Yes";
    case "no":
      return "No";
    default:
      return "Unknown";
  }
}

export function scoreColor(score: number | undefined): Color {
  if (score === undefined) return Color.SecondaryText;
  if (score >= 80) return Color.Green;
  if (score >= 50) return Color.Orange;
  return Color.Red;
}

export function formatToxicity(toxicity: number | undefined): string {
  return toxicity === undefined ? "Unknown" : String(toxicity);
}

export type SignalRow = { label: string; value: string };

/**
 * Bolds any value that is not the quiet default, so the ones that differ can be found at a
 * glance. This is emphasis only — it marks a value as worth reading, not as good or bad.
 */
export function emphasizeSignal(value: string): string {
  return value === "No" || value === "0" ? value : `**${value}**`;
}

/** Every signal Bouncer reports for an address, with its reported value. */
export function getEmailSignals(record: EmailRecord): SignalRow[] {
  return [
    { label: "Free provider", value: formatFlag(record.domain?.free) },
    { label: "Disposable", value: formatFlag(record.domain?.disposable) },
    { label: "Accept-all", value: formatFlag(record.domain?.acceptAll) },
    { label: "Role address", value: formatFlag(record.account?.role) },
    { label: "Disabled", value: formatFlag(record.account?.disabled) },
    { label: "Full mailbox", value: formatFlag(record.account?.fullMailbox) },
    { label: "Toxicity", value: formatToxicity(record.toxicity) },
  ];
}

/** Every signal Bouncer reports for a domain. There is no status field to summarise. */
export function getDomainSignals(record: DomainRecord): SignalRow[] {
  return [
    { label: "Free provider", value: formatFlag(record.domain?.free) },
    { label: "Disposable", value: formatFlag(record.domain?.disposable) },
    { label: "Accept-all", value: formatFlag(record.domain?.acceptAll) },
    { label: "Toxic", value: formatFlag(record.toxic) },
  ];
}

const SIGNALS_PER_LINE = 3;

/**
 * Renders signals three to a line. More than that wraps awkwardly at the default window
 * width, and one per line does not fit the pane height.
 */
export function renderSignalLines(signals: SignalRow[]): string[] {
  const lines: string[] = [];
  for (let i = 0; i < signals.length; i += SIGNALS_PER_LINE) {
    lines.push(
      signals
        .slice(i, i + SIGNALS_PER_LINE)
        .map(({ label, value }) => `**${label}** ${emphasizeSignal(value)}`)
        .join(" · "),
      "",
    );
  }
  return lines;
}
