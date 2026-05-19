import { environment, open } from "@raycast/api";
import { execFile } from "child_process";
import { getFindrPath } from "./utils";

/**
 * Open a bug report URL. Runs findr doctor asynchronously (non-blocking)
 * to collect diagnostics before opening the browser.
 */
export async function openBugReport(errorMessage?: string): Promise<void> {
  const doctorOutput = await new Promise<string>((resolve) => {
    try {
      const findrPath = getFindrPath();
      execFile(
        findrPath,
        ["doctor", "--json"],
        { timeout: 5000 },
        (err, stdout) => {
          resolve(err ? "(findr doctor failed)" : stdout);
        },
      );
    } catch {
      resolve("(findr doctor failed)");
    }
  });

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

  await open(
    `https://github.com/Roderick111/findr/issues/new?${params.toString()}`,
  );
}
