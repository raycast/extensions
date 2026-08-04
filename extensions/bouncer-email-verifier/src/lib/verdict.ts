import { Color, Icon } from "@raycast/api";
import type { BouncerReason, BouncerStatus, DomainRecord, EmailRecord, Flag } from "./bouncer";

export type Verdict = {
  label: string;
  color: Color;
  icon: Icon;
};

export type Recommendation = {
  /** Short imperative headline, mirrors Bouncer's own keep/remove guidance. */
  title: string;
  detail: string;
  color: Color;
  icon: Icon;
};

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

/**
 * Turns a raw record into a keep/suppress call.
 *
 * Bouncer states these directly in https://docs.usebouncer.com/integration-guidelines:
 * keep deliverable, keep risky+acceptAll on a clean list, keep unknown on timeout or
 * unsupported, remove undeliverable, remove risky+fullMailbox, remove toxicity 4-5.
 *
 * Extending their rules, not quoting them: suppress on disposable, suppress on a disabled
 * account, and remove on dns_error. Each follows from a defect Bouncer does report.
 */
export function getRecommendation(record: EmailRecord): Recommendation {
  const avoid = (title: string, detail: string): Recommendation => ({
    title,
    detail,
    color: Color.Red,
    icon: Icon.XMarkCircle,
  });
  const caution = (title: string, detail: string): Recommendation => ({
    title,
    detail,
    color: Color.Orange,
    icon: Icon.Warning,
  });

  if ((record.toxicity ?? 0) >= 4) {
    return avoid(
      "Do Not Send",
      "Bouncer flags this address as highly toxic. Sending to it puts your sender reputation at risk.",
    );
  }

  if (record.status === "undeliverable") {
    return avoid("Remove", undeliverableDetail(record.reason));
  }

  if (record.status === "risky") {
    if (record.account?.fullMailbox === "yes") {
      return avoid("Suppress", "The mailbox is full, so mail will bounce. Bouncer recommends removing it.");
    }
    if (record.domain?.disposable === "yes") {
      return avoid("Suppress", "This is a disposable, throwaway address. It will not stay reachable.");
    }
    if (record.account?.disabled === "yes") {
      return avoid("Suppress", "The account is disabled and will not accept mail.");
    }
    if (record.domain?.acceptAll === "yes") {
      return caution(
        "Send with Caution",
        "The domain accepts all mail, so Bouncer cannot confirm this mailbox exists. Safe on a clean list, risky on a cold one.",
      );
    }
    return caution("Send with Caution", "Bouncer found quality signals that make delivery less likely.");
  }

  if (record.status === "unknown") {
    if (record.reason === "dns_error") {
      return avoid("Remove", "The domain has broken or missing DNS records, so mail cannot be routed.");
    }
    return {
      title: "Retry Later",
      detail: "The mail server did not answer. Bouncer suggests keeping the address and checking again later.",
      color: Color.SecondaryText,
      icon: Icon.Clock,
    };
  }

  // A role address is reported as a signal, not downgraded here. Bouncer's guidelines
  // say nothing about role accounts, and inventing a warning would misattribute it to them.
  return {
    title: "Safe to Send",
    detail: "The mail server accepted this address during verification.",
    color: Color.Green,
    icon: Icon.CheckCircle,
  };
}

function undeliverableDetail(reason: BouncerReason | undefined): string {
  switch (reason) {
    case "invalid_email":
      return "The address is not valid email syntax.";
    case "invalid_domain":
      return "The domain has no mail records, so nothing can be delivered to it.";
    case "rejected_email":
      return "The mail server rejected this address — the mailbox does not exist.";
    default:
      return "Bouncer could not confirm a reachable mailbox at this address.";
  }
}

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

export function toxicityLabel(toxicity: number | undefined): string {
  if (toxicity === undefined) return "Unknown";
  if (toxicity === 0) return "None";
  if (toxicity <= 3) return `${toxicity} · Elevated`;
  return `${toxicity} · High`;
}

export type SignalTag = { text: string; color: Color };

const SIGNAL_READERS: Array<(r: EmailRecord) => Flag | undefined> = [
  (r) => r.account?.fullMailbox,
  (r) => r.account?.disabled,
  (r) => r.domain?.disposable,
  (r) => r.domain?.acceptAll,
  (r) => r.account?.role,
  (r) => r.domain?.free,
];

/**
 * Surfaces only the signals worth acting on, and colors them by what they mean *for this
 * verdict* rather than by a fixed severity.
 *
 * A catch-all domain is the whole reason a `risky` result is risky, but on a confirmed
 * `deliverable` it is trivia — painting both orange teaches the eye to ignore the color.
 *
 * Role and free are never warnings. Both are Bouncer heuristics over the local part and the
 * domain, and both misfire: a personal `mail@` address gets read as a shared role box. They
 * are reported as neutral facts, and they do not move the recommendation.
 *
 * On an undeliverable address the mailbox is gone, so mailbox-quality signals are moot.
 * Raw values for everything stay one keystroke away via Copy Raw Response.
 */
export function getSignalTags(record: EmailRecord): SignalTag[] {
  const info = Color.SecondaryText;
  const dead = record.status === "undeliverable";
  const tags: SignalTag[] = [];

  if (record.domain?.disposable === "yes") tags.push({ text: "Disposable", color: Color.Red });

  const toxicity = record.toxicity ?? 0;
  if (toxicity > 0) {
    tags.push({ text: `Toxicity ${toxicity}`, color: toxicity >= 4 ? Color.Red : Color.Orange });
  }

  if (!dead) {
    if (record.account?.fullMailbox === "yes") tags.push({ text: "Full Mailbox", color: Color.Red });
    if (record.account?.disabled === "yes") tags.push({ text: "Disabled", color: Color.Red });
    if (record.domain?.acceptAll === "yes") {
      tags.push({ text: "Accept-All", color: record.status === "risky" ? Color.Orange : info });
    }
    if (record.account?.role === "yes") tags.push({ text: "Role Address", color: info });
    if (record.domain?.free === "yes") tags.push({ text: "Free Provider", color: info });
  }

  if (tags.length > 0) return tags;
  if (dead) return [{ text: "Not applicable", color: info }];

  const probed = SIGNAL_READERS.some((read) => read(record) === "no");
  return probed ? [{ text: "No flags raised", color: Color.Green }] : [{ text: "Not reported", color: info }];
}

/**
 * A domain lookup returns no status or score, so the verdict is read off the mail setup
 * itself. Bouncer publishes no keep/remove policy for domains — this is our own reading
 * of the fields it returns, and it never claims a specific mailbox exists.
 */
export function getDomainVerdict(record: DomainRecord): Recommendation {
  if (record.domain?.disposable === "yes") {
    return {
      title: "Disposable Provider",
      detail: "This domain hands out throwaway addresses. Treat signups from it as unreachable.",
      color: Color.Red,
      icon: Icon.XMarkCircle,
    };
  }

  if (record.toxic === "yes") {
    return {
      title: "Toxic Domain",
      detail: "Bouncer flags this domain as toxic. Sending to it puts your sender reputation at risk.",
      color: Color.Red,
      icon: Icon.XMarkCircle,
    };
  }

  if (record.dns?.type !== "MX") {
    // Phrased without an article: record types are initialisms, so "a A record" and
    // "an CNAME record" are both wrong and there is no way to pick one that fits all.
    // A type of "unknown" is Bouncer saying it found nothing usable, not a record named that.
    const type = record.dns?.type;
    const named = type && type.toLowerCase() !== "unknown";
    return {
      title: "No MX Record",
      detail: named
        ? `The domain publishes ${type} records but no MX record, so most senders will fail to deliver here.`
        : "Bouncer found no usable mail records for this domain, so nothing can be delivered to it.",
      color: Color.Red,
      icon: Icon.XMarkCircle,
    };
  }

  if (record.domain?.acceptAll === "yes") {
    return {
      title: "Catch-All Domain",
      detail:
        "The server accepts mail for every address, so verifying an individual mailbox here cannot come back confirmed — expect risky results.",
      color: Color.Orange,
      icon: Icon.Warning,
    };
  }

  return {
    title: "Mail Configured",
    detail: "The domain publishes a working MX record and rejects addresses that do not exist.",
    color: Color.Green,
    icon: Icon.CheckCircle,
  };
}

export function getDomainSignalTags(record: DomainRecord): SignalTag[] {
  const info = Color.SecondaryText;
  const tags: SignalTag[] = [];

  if (record.domain?.disposable === "yes") tags.push({ text: "Disposable", color: Color.Red });
  if (record.toxic === "yes") tags.push({ text: "Toxic", color: Color.Red });
  // Unlike a confirmed deliverable address, catch-all is always material for a domain:
  // it is what stops any address here from being verified.
  if (record.domain?.acceptAll === "yes") tags.push({ text: "Accept-All", color: Color.Orange });
  if (record.domain?.free === "yes") tags.push({ text: "Free Provider", color: info });

  if (tags.length > 0) return tags;

  const probed = [record.domain?.acceptAll, record.domain?.disposable, record.domain?.free].some((f) => f === "no");
  return probed ? [{ text: "No flags raised", color: Color.Green }] : [{ text: "Not reported", color: info }];
}
