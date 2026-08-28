import { verifyEmail } from "../lib/bouncer";
import { isValidEmail, normalizeEmail } from "../lib/email";
import { formatFlag, formatReason, formatToxicity, getVerdict } from "../lib/verdict";

type Input = {
  /**
   * The email address to verify, for example "jane@example.com".
   * Must be a single address — this tool does not accept lists.
   */
  email: string;
};

/**
 * Returns what Bouncer reported and nothing more. Flags are stringified so "unknown" can
 * never be mistaken for false, and no send-or-suppress judgement is added on top: that is
 * the caller's to make from the fields below.
 */
export default async function verifyEmailTool(input: Input) {
  const email = normalizeEmail(input.email);

  if (!isValidEmail(email)) {
    throw new Error(`"${input.email}" is not a valid email address, so it was not sent to Bouncer.`);
  }

  const record = await verifyEmail(email);

  return {
    email: record.email,
    status: record.status,
    statusLabel: getVerdict(record.status).label,
    reason: formatReason(record.reason),
    score: record.score,
    domain: record.domain?.name,
    provider: record.provider,
    mailRecord: record.dns?.record,
    signals: {
      freeProvider: formatFlag(record.domain?.free),
      disposable: formatFlag(record.domain?.disposable),
      acceptAll: formatFlag(record.domain?.acceptAll),
      roleAddress: formatFlag(record.account?.role),
      disabled: formatFlag(record.account?.disabled),
      fullMailbox: formatFlag(record.account?.fullMailbox),
      toxicity: formatToxicity(record.toxicity),
    },
    didYouMean: record.didYouMean,
    creditsSpent: 1,
  };
}
