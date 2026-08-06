import { verifyDomain } from "../lib/bouncer";
import { isValidDomain, normalizeDomain } from "../lib/domain";
import { formatFlag } from "../lib/verdict";

type Input = {
  /**
   * The domain to check, for example "example.com".
   * A full email address or a URL is also accepted — only the domain part is used.
   */
  domain: string;
};

/**
 * Bouncer's domain endpoint returns no status, score or verdict, only the fields below.
 * They are passed through as reported rather than summarised into a conclusion.
 */
export default async function verifyDomainTool(input: Input) {
  const domain = normalizeDomain(input.domain);

  if (!isValidDomain(domain)) {
    throw new Error(`"${input.domain}" is not a valid domain, so it was not sent to Bouncer.`);
  }

  const record = await verifyDomain(domain);

  return {
    domain: record.domain?.name,
    provider: record.provider,
    dnsType: record.dns?.type,
    mailRecord: record.dns?.record,
    signals: {
      freeProvider: formatFlag(record.domain?.free),
      disposable: formatFlag(record.domain?.disposable),
      acceptAll: formatFlag(record.domain?.acceptAll),
      toxic: formatFlag(record.toxic),
    },
    creditsSpent: 1,
  };
}
