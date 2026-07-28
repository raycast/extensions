import { Email, ProcessedEmail, LinkCandidate, ValidatedLink, LearnedLinkPattern } from "./types";
import { extractBodies, getHeaderValue } from "./mime";
import { sanitizeHtml } from "./html";
import { extractOtp, isValidOtp } from "./otp";
import { parseSender, getRegistrableDomainForEmail } from "./domain";
import { extractLinkCandidates, selectVerificationLink, getAmbiguousLinks } from "./links";

export interface ExtractionOptions {
  learnedPatterns?: LearnedLinkPattern[];
}

export async function extractVerificationMethods(
  email: Email,
  options: ExtractionOptions = {},
): Promise<ProcessedEmail> {
  const bodies = extractBodies(email.payload);
  const htmlResult = bodies.htmlText ? sanitizeHtml(bodies.htmlText) : { text: "", anchors: [] };
  const plainText = bodies.plainText || "";
  const visibleText = plainText || htmlResult.text;

  const fromHeader = getHeaderValue(email.payload, "From");
  const sender = parseSender(fromHeader);
  const senderRegistrableDomain = getRegistrableDomainForEmail(sender.email);
  const learnedPatterns = options.learnedPatterns ?? [];

  const rawOtp = extractOtp(visibleText);

  let link: ValidatedLink | undefined;
  let ambiguousLinks: LinkCandidate[] = [];

  if (senderRegistrableDomain && htmlResult.anchors.length > 0) {
    const context = {
      senderRegistrableDomain,
      senderAddress: sender.email,
      learnedPatterns,
    };

    const candidates = extractLinkCandidates(htmlResult.anchors, context);
    const selected = selectVerificationLink(candidates);

    if (selected) {
      link = selected.link;
      ambiguousLinks = selected.remaining;
    } else {
      ambiguousLinks = getAmbiguousLinks(candidates);
    }
  }

  return {
    otp: isValidOtp(rawOtp) ? rawOtp : undefined,
    link,
    ambiguousLinks,
    sender,
    receivedAt: new Date(parseInt(email.internalDate, 10)),
    emailText: visibleText,
    senderRegistrableDomain,
    learnedPatterns,
  };
}

export function emailMatchesKeywords(processed: ProcessedEmail, keywords: string[]): boolean {
  const lowerText = processed.emailText.toLowerCase();
  const senderText = `${processed.sender.name} ${processed.sender.email}`.toLowerCase();
  return keywords.some((keyword) => lowerText.includes(keyword) || senderText.includes(keyword));
}

export { normalizeCtaText } from "./links";
