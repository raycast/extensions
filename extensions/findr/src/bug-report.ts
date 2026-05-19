import { environment } from "@raycast/api";
import { execFileSync } from "child_process";
import { getFindrPath } from "./utils";

export function buildBugReportUrl(errorMessage?: string): string {
  let doctorOutput = "";
  try {
    const findrPath = getFindrPath();
    doctorOutput = execFileSync(findrPath, ["doctor", "--json"], {
      timeout: 5000,
      encoding: "utf-8",
    });
  } catch {
    doctorOutput = "(findr doctor failed)";
  }

  const title = errorMessage
    ? `Bug: ${errorMessage.slice(0, 80)}`
    : "Bug report from Raycast extension";

  const body = `## What happened

<!-- Describe what you were doing and what went wrong -->

## Environment

- Raycast extension version: ${environment.extensionName}
- macOS: ${process.platform} ${process.arch}

## Diagnostics

\`\`\`json
${doctorOutput}
\`\`\`

${errorMessage ? `## Error\n\n\`\`\`\n${errorMessage}\n\`\`\`` : ""}
`;

  const params = new URLSearchParams({
    title,
    body,
    labels: "bug",
  });

  return `https://github.com/Roderick111/findr/issues/new?${params.toString()}`;
}
