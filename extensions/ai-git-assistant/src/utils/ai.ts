import { AI, environment } from "@raycast/api";
import { getBranchDiff, getBranchStatus, getPrDiff } from "./git";

export async function generateCommitMessage(repositoryPath: string, prompt: string) {
  if (!environment.canAccess(AI)) {
    throw Error("You don't have access to AI :(");
  }

  const input = buildInputForCommitMessageGeneration(repositoryPath, prompt);
  return AI.ask(input, { creativity: "none" });
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

  const input = buildInputForPrDescriptionGeneration(repositoryPath, currentBranch, baseBranch, prompt);
  return AI.ask(input, { creativity: "none" });
}

function buildInputForCommitMessageGeneration(repositoryPath: string, prompt: string) {
  const diffOutput = getBranchDiff(repositoryPath);
  const statusOutput = getBranchStatus(repositoryPath);

  return `${prompt}\n\nMy git status is: \n\n${statusOutput}\n\nMy git diff is: \n\n${diffOutput}.\n\n`;
}

function buildInputForPrDescriptionGeneration(
  repositoryPath: string,
  currentBranch: string,
  baseBranch: string,
  prompt: string,
) {
  const diffOutput = getPrDiff(repositoryPath, currentBranch, baseBranch);

  return `${prompt}\n\nMy git diff is: \n\n${diffOutput}.\n\n`;
}
