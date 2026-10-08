import { htmlToMarkdown } from "mdream";

import { Result, Test } from "@/types";

/**
 * Extracts a valid domain name from a query string.
 * Returns the domain name (hostname) or null if no valid domain is found.
 *
 * @param query - The input string to extract domain from
 * @returns The domain name (hostname) or null
 */
export const extractDomain = (query: string): string | null => {
  if (!query?.trim()) {
    return null;
  }

  // Clean the input - take the first word if multiple words
  const cleanQuery = query.trim().split(" ")[0];

  try {
    // Try to parse as URL - this handles most cases correctly
    const url = new URL(cleanQuery.startsWith("http") ? cleanQuery : `https://${cleanQuery}`);
    return url.hostname;
  } catch {
    // If URL parsing fails, the input is likely not a valid domain/URL
    return null;
  }
};

const getTestMarkdown = (test: Test) => {
  return `## ${test.title}

  - ${test.pass === null ? "Result: 🞈 N/A" : test.pass ? "Result: ✅ Pass" : "Result: ❌ Fail"}
  - Score Modifier: ${test.score_modifier}

  ${htmlToMarkdown(test.score_description)}

  ---
  `;
};

export const getReportMarkdown = (domain: string, data: Result) => {
  const tests = Object.values(data.tests ?? {});
  return `
  # Scan Summary: ${domain}

  ---

  ${tests.map((test) => getTestMarkdown(test)).join("\n")}

  `;
};
