import { htmlToMarkdown } from "mdream";

import { Result, Test } from "@/types";

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
