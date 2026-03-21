import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  AI,
  environment,
  getPreferenceValues,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { GiteaAPI } from "./api/gitea";

interface ReviewPullRequestProps {
  prNumber: number;
}

interface Preferences {
  aiModel?: string;
  reviewLanguage?: string;
  javaVersion?: string;
}

const AVAILABLE_MODELS = [
  { name: "Claude Sonnet 4.5", value: "anthropic-claude-sonnet-4-5" },
  { name: "Claude Opus 4.5", value: "anthropic-claude-opus-4-5" },
  { name: "Claude Haiku 4.5", value: "anthropic-claude-haiku-4-5" },
  { name: "GPT-4 Turbo", value: "openai-gpt-4-turbo" },
  { name: "GPT-4o", value: "openai-gpt-4o" },
  { name: "GPT-3.5 Turbo", value: "openai-gpt-3.5-turbo" },
];

type ModelBudget = {
  contextWindowTokens: number;
  reservedOutputTokens: number;
  usableInputRatio: number;
};

const DEFAULT_BUDGET: ModelBudget = {
  contextWindowTokens: 16000,
  reservedOutputTokens: 3000,
  usableInputRatio: 0.6,
};

const CHUNK_WARNING_THRESHOLD = 12;

const MODEL_BUDGETS: Record<string, ModelBudget> = {
  "openai-gpt-3.5-turbo": {
    contextWindowTokens: 16000,
    reservedOutputTokens: 2500,
    usableInputRatio: 0.55,
  },
  "openai-gpt-4-turbo": {
    contextWindowTokens: 128000,
    reservedOutputTokens: 5000,
    usableInputRatio: 0.72,
  },
  "openai-gpt-4o": {
    contextWindowTokens: 128000,
    reservedOutputTokens: 5000,
    usableInputRatio: 0.72,
  },
  "anthropic-claude-haiku-4-5": {
    contextWindowTokens: 200000,
    reservedOutputTokens: 6000,
    usableInputRatio: 0.78,
  },
  "anthropic-claude-sonnet-4-5": {
    contextWindowTokens: 200000,
    reservedOutputTokens: 6000,
    usableInputRatio: 0.8,
  },
  "anthropic-claude-opus-4-5": {
    contextWindowTokens: 200000,
    reservedOutputTokens: 7000,
    usableInputRatio: 0.8,
  },
};

const LANGUAGE_LABELS: Record<string, string> = {
  general: "General / All-rounder",
  java: "Java",
  typescript: "TypeScript/JavaScript",
  python: "Python",
  go: "Go",
  rust: "Rust",
  cpp: "C/C++",
  csharp: "C#",
  kotlin: "Kotlin",
  swift: "Swift",
  ruby: "Ruby",
  php: "PHP",
  scala: "Scala",
  shell: "Shell/Bash",
};

function buildReviewerPersona(language: string, javaVersion?: string): string {
  if (!language || language === "general") {
    return "You are a senior software engineer performing a pull request review.";
  }
  const label = LANGUAGE_LABELS[language] ?? language;
  const versionSuffix = language === "java" && javaVersion ? ` targeting ${javaVersion}` : "";
  return `You are a senior ${label} engineer${versionSuffix} performing a pull request review. Apply ${label}-specific best practices, idioms, and conventions throughout your analysis.`;
}

function estimateTokenCount(text: string): number {
  // Rough heuristic for mixed source code + markdown prompts.
  return Math.ceil(text.length / 4);
}

function getModelBudget(model: string): ModelBudget {
  return MODEL_BUDGETS[model] ?? DEFAULT_BUDGET;
}

function getMaxChunkTokens(model: string, staticPromptTokens: number, relaxed = false): number {
  const budget = getModelBudget(model);
  const availableInput = Math.max(
    0,
    budget.contextWindowTokens - budget.reservedOutputTokens - staticPromptTokens
  );

  if (relaxed) {
    return Math.max(3000, availableInput);
  }

  return Math.max(3000, Math.floor(availableInput * budget.usableInputRatio));
}

function splitDiffIntoTokenChunks(diff: string, maxChunkTokens: number): string[] {
  const lines = diff.split("\n");
  const chunks: string[] = [];
  let currentChunk = "";

  for (const line of lines) {
    const candidate = currentChunk ? `${currentChunk}\n${line}` : line;

    if (estimateTokenCount(candidate) <= maxChunkTokens) {
      currentChunk = candidate;
      continue;
    }

    if (currentChunk) {
      chunks.push(currentChunk);
      currentChunk = "";
    }

    if (estimateTokenCount(line) <= maxChunkTokens) {
      currentChunk = line;
      continue;
    }

    // Fallback for unusually long lines.
    const maxLineChars = maxChunkTokens * 4;
    for (let start = 0; start < line.length; start += maxLineChars) {
      chunks.push(line.slice(start, start + maxLineChars));
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks.length ? chunks : [diff];
}

function createChunkReviewPrompt(params: {
  title: string;
  description: string;
  fileSummary: string;
  chunk: string;
  chunkIndex: number;
  chunkCount: number;
  persona: string;
}): string {
  return `${params.persona}

Pull Request Title: ${params.title}
Pull Request Description: ${params.description}

Changed Files:
${params.fileSummary}

Diff Chunk ${params.chunkIndex}/${params.chunkCount}:
\`\`\`diff
${params.chunk}
\`\`\`

Task:
1. Identify concrete risks, bugs, regressions, and security concerns.
2. Include file names and line numbers where possible.
3. Note maintainability and best-practice issues.
4. Keep this chunk report concise and actionable.

Output format (Markdown):
- Chunk Summary (2-4 bullets)
- Findings (bulleted, severity-tagged)
- Suggestions (bulleted)
`;
}

function createSynthesisPrompt(partialReviews: string[], persona: string): string {
  return `${persona} You are finalizing a pull request review from multiple chunk-level analyses.

Combine and deduplicate the findings below, preserving the most important technical issues.

Partial Reviews:
${partialReviews.map((review, index) => `\n### Partial Review ${index + 1}\n${review}`).join("\n")}

Produce a final Markdown report with this structure:
1. Brief Summary
2. Critical Findings
3. Security Concerns
4. Improvement Suggestions
5. Best Practice Violations

Rules:
- Deduplicate repeated findings.
- Prioritize correctness and risk.
- Keep it concise and specific.
- Include file/line references when present in partial reviews.
`;
}

export default function ReviewPullRequest({ prNumber }: ReviewPullRequestProps) {
  const giteaApi = new GiteaAPI();
  const preferences = getPreferenceValues<Preferences>();
  const [aiReview, setAiReview] = useState<string>("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(
    preferences.aiModel || "anthropic-claude-sonnet-4-5"
  );

  const { data: pullRequest, isLoading: isPrLoading } = usePromise(
    async () => await giteaApi.getPullRequest(prNumber)
  );

  const { data: files, isLoading: isFilesLoading } = usePromise(
    async () => await giteaApi.getPullRequestFiles(prNumber)
  );

  const { data: diff, isLoading: isDiffLoading } = usePromise(
    async () => await giteaApi.getPullRequestDiff(prNumber)
  );

  const isLoading = isPrLoading || isFilesLoading || isDiffLoading;

  const performAIReview = async () => {
    if (!diff || !pullRequest) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot review",
        message: "Pull request data not loaded",
      });
      return;
    }

    setIsReviewing(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Analyzing code...",
    });

    try {
      // Check if AI is available
      if (!environment.canAccess(AI)) {
        throw new Error("Raycast AI is not available. Please enable it in settings.");
      }

      const fileSummary = (files ?? [])
        .map((f) => `- ${f.filename} (+${f.additions} -${f.deletions})`)
        .join("\n");
      const description = pullRequest.body || "No description provided";
      const persona = buildReviewerPersona(
        preferences.reviewLanguage ?? "general",
        preferences.javaVersion
      );

      const staticPrompt = createChunkReviewPrompt({
        title: pullRequest.title,
        description,
        fileSummary: fileSummary || "- No file metadata available",
        chunk: "",
        chunkIndex: 1,
        chunkCount: 1,
        persona,
      });

      const staticTokens = estimateTokenCount(staticPrompt);
      const maxChunkTokens = getMaxChunkTokens(selectedModel, staticTokens);
      let diffChunks = splitDiffIntoTokenChunks(diff, maxChunkTokens);

      if (diffChunks.length > CHUNK_WARNING_THRESHOLD) {
        const relaxedChunkTokens = getMaxChunkTokens(selectedModel, staticTokens, true);
        const relaxedChunks = splitDiffIntoTokenChunks(diff, relaxedChunkTokens);

        if (relaxedChunks.length < diffChunks.length) {
          diffChunks = relaxedChunks;
        }
      }

      if (diffChunks.length > CHUNK_WARNING_THRESHOLD) {
        toast.message = `Large PR detected: ${diffChunks.length} chunks. Review may take longer.`;
      }

      if (diffChunks.length === 1) {
        const prompt = createChunkReviewPrompt({
          title: pullRequest.title,
          description,
          fileSummary: fileSummary || "- No file metadata available",
          chunk: diffChunks[0],
          chunkIndex: 1,
          chunkCount: 1,
          persona,
        });

        const response = await AI.ask(prompt, {
          model: selectedModel as AI.Model,
        });

        setAiReview(response);
      } else {
        const partialReviews: string[] = [];

        for (const [index, chunk] of diffChunks.entries()) {
          toast.title = `Analyzing code (${index + 1}/${diffChunks.length})...`;

          const chunkPrompt = createChunkReviewPrompt({
            title: pullRequest.title,
            description,
            fileSummary: fileSummary || "- No file metadata available",
            chunk,
            chunkIndex: index + 1,
            chunkCount: diffChunks.length,
            persona,
          });

          const partialReview = await AI.ask(chunkPrompt, {
            model: selectedModel as AI.Model,
          });

          partialReviews.push(partialReview);
        }

        toast.title = "Consolidating findings...";

        const synthesisPrompt = createSynthesisPrompt(partialReviews, persona);
        const finalReview = await AI.ask(synthesisPrompt, {
          model: selectedModel as AI.Model,
        });

        setAiReview(finalReview);
      }

      toast.style = Toast.Style.Success;
      toast.title = "Review completed";
    } catch (error) {
      console.error("AI Review error:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Review failed";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    } finally {
      setIsReviewing(false);
    }
  };

  const postReviewToGitea = async () => {
    if (!aiReview) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No review to post",
        message: "Please run AI review first",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Posting review to Gitea...",
    });

    try {
      const reviewComment = `## AI Code Review\n\n${aiReview}\n\n---\n*Generated by Raycast AI*`;
      await giteaApi.createPullRequestComment(prNumber, reviewComment);

      toast.style = Toast.Style.Success;
      toast.title = "Review posted";
      toast.message = "AI review has been added to the pull request";
    } catch (error) {
      console.error("Error posting review:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to post review";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  };

  const currentModelName =
    AVAILABLE_MODELS.find((m) => m.value === selectedModel)?.name || selectedModel;

  const markdown = `
# Pull Request #${prNumber}${pullRequest ? `: ${pullRequest.title}` : ""}

${pullRequest?.body ? `## Description\n\n${pullRequest.body}\n\n` : ""}

## Details

- **Author:** ${pullRequest?.user.login || "Loading..."}
- **Branch:** ${pullRequest?.head.ref || "?"} → ${pullRequest?.base.ref || "?"}
- **Files Changed:** ${files?.length || 0}
- **Additions:** ${files?.reduce((sum, f) => sum + f.additions, 0) || 0}
- **Deletions:** ${files?.reduce((sum, f) => sum + f.deletions, 0) || 0}
- **AI Model:** ${currentModelName}

${files?.length ? `## Changed Files\n\n${files.map((f) => `- \`${f.filename}\` (+${f.additions} -${f.deletions})`).join("\n")}\n\n` : ""}

${aiReview ? `## AI Review\n\n${aiReview}\n\n` : ""}

---

${!aiReview ? "*Press Enter (or ⌘+R) to start AI-powered code review*" : "*Press Enter to post review to Gitea*"}
`;

  return (
    <Detail
      isLoading={isLoading || isReviewing}
      markdown={markdown}
      actions={
        <ActionPanel>
          {aiReview ? (
            <>
              <Action
                title="Post Review to Gitea"
                icon={Icon.Upload}
                onAction={postReviewToGitea}
              />
              <Action
                title="AI Review"
                icon={Icon.Wand}
                onAction={performAIReview}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </>
          ) : (
            <Action title="AI Review" icon={Icon.Wand} onAction={performAIReview} />
          )}
          <ActionPanel.Submenu
            title="Change AI Model"
            icon={Icon.Stars}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
          >
            {AVAILABLE_MODELS.map((model) => (
              <Action
                key={model.value}
                title={model.name}
                icon={selectedModel === model.value ? Icon.Checkmark : Icon.Circle}
                onAction={() => setSelectedModel(model.value)}
              />
            ))}
          </ActionPanel.Submenu>
          {pullRequest && (
            <Action.OpenInBrowser
              title="Open in Gitea"
              url={pullRequest.html_url}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          )}
          {diff && (
            <Action.CopyToClipboard
              title="Copy Diff"
              content={diff}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
          )}
          {aiReview && (
            <Action.CopyToClipboard
              title="Copy Review"
              content={aiReview}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
