import { verifyDomain } from "../lib/bouncer";
import { isValidDomain, normalizeDomain } from "../lib/domain";
import { formatFlag, getDomainVerdict } from "../lib/verdict";

type Input = {
  /**
   * The domain to check, for example "example.com".
   * A full email address or a URL is also accepted — only the domain part is used.
   */
  domain: string;
};

export default async function verifyDomainTool(input: Input) {
  const domain = normalizeDomain(input.domain);

  if (!isValidDomain(domain)) {
    throw new Error(`"${input.domain}" is not a valid domain, so it was not sent to Bouncer.`);
  }

  const record = await verifyDomain(domain);
  const verdict = getDomainVerdict(record);

  return {
    domain: record.domain?.name,
    mailSetup: verdict.title,
    explanation: verdict.detail,
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
