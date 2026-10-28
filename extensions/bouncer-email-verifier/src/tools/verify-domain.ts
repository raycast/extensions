import { verifyDomain } from "../lib/bouncer";
import { isValidDomain, normalizeDomain } from "../lib/domain";
import { saveToHistory } from "../lib/history";
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
    throw new Error(`"${input.domain}" is not a valid domain, so it was not sent to Bouncer and no credit was spent.`);
  }

  const record = await verifyDomain(domain);
  // verifyDomain always fills in the name, so the row has a subject.
  await saveToHistory({
    kind: "domain",
    subject: record.domain?.name ?? domain,
    record,
    verifiedAt: Date.now(),
  }).catch(() => undefined);

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
    note: "Bouncer reports the mail record and provider it found. It does not test delivery, so this does not show whether the domain receives mail.",
  };
}
