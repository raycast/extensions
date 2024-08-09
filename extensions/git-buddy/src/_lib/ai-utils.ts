import { AI, getPreferenceValues } from "@raycast/api";
import { getRepoPath, getStagedGitDiff, getDiffComparedToBranch, getCurrentBranchName } from "./git-utils";

const CREATIVITY_LEVEL = "medium";

export async function getAIModel(preferenceKey: string): Promise<AI.Model> {
  const preferences = await getPreferenceValues<{ [key: string]: string }>();
  const aiModelKey = preferences[preferenceKey];
  if (!aiModelKey) {
    throw new Error("No AI model provided");
  }
  const aiModel = AI.Model[aiModelKey as keyof typeof AI.Model];
  if (!aiModel) {
    throw new Error(`Invalid AI model: ${aiModelKey}`);
  }
  return aiModel;
}

interface FetchAIContentOptions {
  diffType: "staged" | "targetBranch";
  aiModelName: string;
  aiPrompt: string;
  targetBranch?: string;
}

interface GitDiffOptions {
  diffType: "staged" | "targetBranch";
  repoPath: string;
  targetBranch?: string;
}

async function getGitDiff({ diffType, repoPath, targetBranch }: GitDiffOptions) {
  if (diffType === "staged") {
    return await getStagedGitDiff(repoPath);
  } else if (diffType === "targetBranch" && targetBranch) {
    return await getDiffComparedToBranch(repoPath, targetBranch);
  } else {
    throw new Error("Invalid diffType or missing targetBranch");
  }
}

export async function fetchAIContent(options: FetchAIContentOptions) {
  const { diffType, aiModelName, aiPrompt, targetBranch } = options;
  try {
    const repoPath = await getRepoPath();
    const gitDiff = await getGitDiff({ diffType, repoPath, targetBranch });

    if (!gitDiff) {
      throw new Error("Git diff is empty.");
    }

    const aiModel = await getAIModel(aiModelName);
    const aiContent = await AI.ask(`${aiPrompt}${gitDiff}`, { model: aiModel, creativity: CREATIVITY_LEVEL });
    const branchName = await getCurrentBranchName(repoPath);
    return { aiContent, branchName };
  } catch (error) {
    const err = error as Error;
    throw new Error(`Failed to fetch AI content: ${err.message}`);
  }
}
