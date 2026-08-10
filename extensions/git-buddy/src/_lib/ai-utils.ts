import { AI, getPreferenceValues } from "@raycast/api";
import { getRepoPath, getStagedGitDiff, getDiffComparedToBranch, getCurrentBranchName } from "./git";
import { ERROR_MESSAGES } from "../_constants";
import { handleFetchAIContentError } from "./error-utils";

const CREATIVITY_LEVEL = "medium";

interface FetchAIContentOptions {
  diffType: "staged" | "baseBranch";
  aiModelName: string;
  aiPrompt: string;
  baseBranch?: string;
}

interface GitDiffOptions {
  diffType: "staged" | "baseBranch";
  repoPath: string;
  baseBranch?: string;
}

async function getAIModel(preferenceKey: string): Promise<AI.Model> {
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

async function getGitDiff({ diffType, repoPath, baseBranch }: GitDiffOptions): Promise<string> {
  if (diffType === "staged") {
    return await getStagedGitDiff(repoPath);
  } else if (diffType === "baseBranch" && baseBranch) {
    return await getDiffComparedToBranch(repoPath, baseBranch);
  } else {
    throw new Error("Invalid diffType or missing baseBranch");
  }
}

export async function fetchAIContent(options: FetchAIContentOptions) {
  const { diffType, aiModelName, aiPrompt, baseBranch } = options;
  try {
    const repoPath = await getRepoPath();
    const gitDiff = await getGitDiff({ diffType, repoPath, baseBranch });

    if (!gitDiff) {
      throw new Error(ERROR_MESSAGES.GIT_DIFF_EMPTY);
    }

    const aiModel = await getAIModel(aiModelName);
    const aiContent = await AI.ask(`${aiPrompt}${gitDiff}`, { model: aiModel, creativity: CREATIVITY_LEVEL });
    const branchName = await getCurrentBranchName(repoPath);
    return { aiContent, branchName };
  } catch (error) {
    handleFetchAIContentError(error as Error, diffType);
  }
}
