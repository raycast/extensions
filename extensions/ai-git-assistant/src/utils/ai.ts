import { AI, environment } from "@raycast/api";
import { verifyGitRepository, getBranchDiff, getBranchStatus, getPrDiff } from "./git";

interface ParsedCommitMessage {
  summary: string;
  details: string[];
}

// 解析 AI 回應的輔助函數
function parseAIResponse(response: string): ParsedCommitMessage {
  const lines = response
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let summary = "";
  const details: string[] = [];

  const summaryIndex = lines.findIndex((line) => line.toLowerCase().includes("commit summary:"));
  if (summaryIndex !== -1 && summaryIndex + 1 < lines.length) {
    summary = lines[summaryIndex + 1].trim();
  }

  const detailsIndex = lines.findIndex((line) => line.toLowerCase().includes("commit message:"));
  if (detailsIndex !== -1) {
    const detailLines = lines.slice(detailsIndex + 1);
    details.push(
      ...detailLines
        .filter((line) => line.startsWith("•") || line.startsWith("-") || line.startsWith("*"))
        .map((line) => {
          line = line.trim();
          if (line.startsWith("-") || line.startsWith("*")) {
            line = "•" + line.slice(1);
          }
          return line;
        }),
    );
  }

  // 如果沒有找到標準格式，嘗試進行備用解析
  if (!summary || details.length === 0) {
    summary =
      lines.find(
        (line) =>
          !line.startsWith("•") &&
          !line.startsWith("-") &&
          !line.startsWith("*") &&
          !line.toLowerCase().includes("commit"),
      ) || "";

    details.push(
      ...lines
        .filter((line) => line.startsWith("•") || line.startsWith("-") || line.startsWith("*"))
        .map((line) => {
          line = line.trim();
          if (line.startsWith("-") || line.startsWith("*")) {
            line = "•" + line.slice(1);
          }
          return line;
        }),
    );
  }

  return { summary, details };
}

export async function generateCommitMessage(repositoryPath: string, prompt: string) {
  if (!repositoryPath) {
    throw new Error("Repository path is required");
  }

  if (!verifyGitRepository(repositoryPath)) {
    throw new Error("Invalid Git repository path");
  }

  if (!environment.canAccess(AI)) {
    throw Error("You don't have access to AI :(");
  }

  const diffOutput = getBranchDiff(repositoryPath);
  const statusOutput = getBranchStatus(repositoryPath);

  const enhancedPrompt = `
Generate a Git commit message for the following changes. Format your response EXACTLY as follows:

Commit Summary:
[One line summary in imperative mood, max 50 chars]

Commit Message:
- [First detail point]
- [Second detail point]
- [Additional points as needed]

Rules:
1. Summary MUST be in imperative mood (e.g., "Add", "Fix", "Update")
2. Summary should be specific and meaningful
3. Detail points should explain what changed and why
4. Each detail MUST start with a bullet point (•)
5. Each detail should be on a new line
6. Keep details concise but informative

${prompt}

My git status is:

${statusOutput}

My git diff is:

${diffOutput}

Remember: Format the response EXACTLY as shown above, with "Commit Summary:" and "Commit Message:" labels.
`;

  const response = await AI.ask(enhancedPrompt, { creativity: "none" });
  const parsed = parseAIResponse(response);
  return `${parsed.summary}\n\n${parsed.details.join("\n")}`;
}

export async function generatePrDescription(
  repositoryPath: string,
  currentBranch: string,
  baseBranch: string,
  prompt: string,
) {
  if (!environment.canAccess(AI)) {
    throw Error("You don't have access to AI :(");
  }

  const diffOutput = getPrDiff(repositoryPath, currentBranch, baseBranch);
  return AI.ask(`${prompt}\n\nMy git diff is: \n\n${diffOutput}.\n\n`, { creativity: "none" });
}
