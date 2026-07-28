import { getPreferenceValues } from "@raycast/api";
import { emailFilterKeywords } from "./constants";
import { Email, ProcessedEmail } from "./types";
import { extractVerificationMethods, emailMatchesKeywords, normalizeCtaText } from "./extractor";
import { getLearnedPatterns } from "./learning";

export { normalizeCtaText };

export async function processEmails(emails: Email[]): Promise<{
  recentEmails: ProcessedEmail[];
  verificationCodes: ProcessedEmail[];
}> {
  if (!emails || emails.length === 0) {
    return { recentEmails: [], verificationCodes: [] };
  }

  const recentEmails: ProcessedEmail[] = [];
  const verificationCodes: ProcessedEmail[] = [];

  const customKeywords = getPreferenceValues().emailFilterKeywords;
  const filterKeywords = customKeywords
    ? customKeywords
        .split(",")
        .map((k: string) => k.trim().toLowerCase())
        .filter(Boolean)
    : emailFilterKeywords;

  const learnedPatterns = await getLearnedPatterns();

  for (const email of emails) {
    try {
      const processed = await extractVerificationMethods(email, { learnedPatterns });

      if (!emailMatchesKeywords(processed, filterKeywords)) {
        continue;
      }

      if (processed.otp || processed.link) {
        verificationCodes.push(processed);
      } else {
        recentEmails.push(processed);
      }
    } catch (error) {
      // Fail closed: log nothing sensitive, skip this email
      console.error("Failed to process email", error);
    }
  }

  return { recentEmails, verificationCodes };
}
