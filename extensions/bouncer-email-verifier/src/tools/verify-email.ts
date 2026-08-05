import { verifyEmail } from "../lib/bouncer";
import { isValidEmail, normalizeEmail } from "../lib/email";
import { formatFlag, formatReason, getRecommendation, getVerdict } from "../lib/verdict";

type Input = {
  /**
   * The email address to verify, for example "jane@example.com".
   * Must be a single address — this tool does not accept lists.
   */
  email: string;
};

/**
 * Returns plain data rather than the UI model: colors and icons mean nothing to a
 * language model, and the flags are stringified so "unknown" is never mistaken for false.
 */
export default async function verifyEmailTool(input: Input) {
  const email = normalizeEmail(input.email);

  if (!isValidEmail(email)) {
    throw new Error(`"${input.email}" is not a valid email address, so it was not sent to Bouncer.`);
  }

  const record = await verifyEmail(email);
  const recommendation = getRecommendation(record);

  return {
    email: record.email,
    verdict: getVerdict(record.status).label,
    status: record.status,
    recommendation: recommendation.title,
    explanation: recommendation.detail,
    score: record.score,
    reason: formatReason(record.reason),
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
    },
    toxicity: record.toxicity,
    didYouMean: record.didYouMean,
    creditsSpent: 1,
  };
}
