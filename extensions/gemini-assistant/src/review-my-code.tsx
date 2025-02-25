import { Detail, showToast, Toast } from "@raycast/api";
import { getGitDiff } from "./adapter/git-command-adapter";
import { ReviewParameters, ReviewSelectionForm } from "./components/ReviewSelectionForm";
import { useEffect, useState } from "react";
import { GenerateContentResponse } from "@google/generative-ai";
import { useCachedState, useFetch } from "@raycast/utils";
import { getPreferenceByValue } from "./adapter/preferences-adapter";
import { format } from "./core/string-utils";

export const prompt =
  "Given the following Git diff between a developer's branch and the origin/main branch, analyze the changes and provide a constructive code review. The goal is to help the developer identify improvements before submitting the code to a human reviewer.\\n\\n#### Git Diff\\n```\\ndiff\\n{0}\\n```\\n\\n### Review Guidelines\\n1. **Best Practices Compliance**: Identify deviations from standard coding practices, including naming conventions, SOLID principles, DRY, KISS, and other general coding guidelines.\\n2. **Code Quality**: Highlight areas related to readability, maintainability, and performance improvements.\\n3. **Bug Detection**: Detect potential logic errors or problematic patterns that may cause unintended behavior.\\n4. **Security Concerns**: Flag any security vulnerabilities or unsafe coding practices.\\n5. **Optimization Suggestions**: Provide insights on improving efficiency where applicable.\\n6. **Severity Categorization**: Classify each identified issue into one of the following levels:\\n   - **Critical**: Must be addressed before merging, as it may introduce security risks, major bugs, or serious performance issues (use a red circle emoji for this level).\\n   - **Major**: Strongly recommended fixes that impact maintainability, best practices, or potential performance problems (use an orange circle emoji for this level).\\n   - **Minor**: Non-blocking suggestions that improve readability, efficiency, or minor stylistic consistency (use a blue circle emoji for this level).\\n\\n### Response Format\\n- The response must be in **Markdown** and use headings starting from `##` (Heading 2).\\n- Each section headings needs to start with an emoji.\\n- Each issue should be categorized under the appropriate severity level.\\n- The review should be concise while still offering enough detail for the developer to understand the reasoning behind the feedback.\\n- No direct fixes should be provided—only suggestions and explanations.\\n\\n### Context Considerations\\n- The model should analyze **only the provided Git diff** without requiring broader project context.\\n- The review should be **language-agnostic**, adapting feedback based on common best practices for the detected programming language.";

function getBranchDiffAndHandleError(reviewParameters: ReviewParameters): string {
  try {
    return getGitDiff(
      reviewParameters.repository.repositoryPath,
      reviewParameters.currentBranch,
      reviewParameters.targetBranch,
    );
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Error while fetching diff between current branch and target branch",
      message: "Make sure the selected branches exists",
    });
    throw new Error("Error while fetching diff between current branch and target branch");
  }
}

export default function Command() {
  const [modelReview, setModelReview] = useState<string>("");
  const [loadingModelReview, setLoadingModelReview] = useState<boolean>(false);
  const [requestBody, setRequestBody] = useState<string | null>(null);
  const [reviewParameterState] = useCachedState<ReviewParameters>("review-parameter-state", {
    repository: {
      repositoryPath: "",
      repositoryName: "",
    },
    currentBranch: "",
    targetBranch: "main",
  });
  const { error, revalidate } = useFetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${getPreferenceByValue("geminiApiKey")}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
      execute: false,
      onWillExecute: () => {
        setModelReview("⏳ Fetching model recommandation...");
        setLoadingModelReview(true);
      },
      onData: (data: GenerateContentResponse) => {
        if (data !== undefined) {
          const candidateResponse = data.candidates?.at(0);
          if (candidateResponse !== undefined) {
            setModelReview(candidateResponse.content.parts[0].text ?? "Aucune réponse obtenue.");
            setLoadingModelReview(false);
            return;
          }
        }
        setModelReview("Aucune réponse obtenue.");
        setLoadingModelReview(false);
      },
      onError: (error) => {
        console.log(error);
        setLoadingModelReview(false);
      },
    },
  );

  useEffect(() => {
    if (requestBody) {
      revalidate();
    }
  }, [requestBody]);

  function triggerModelRecommendation() {
    if (reviewParameterState !== undefined) {
      const diffResult = getBranchDiffAndHandleError(reviewParameterState);
      setRequestBody(
        JSON.stringify({
          contents: [
            {
              parts: [{ text: format(prompt, diffResult) }],
            },
          ],
        }),
      );
    }
  }

  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Erreur", message: error.message });
    return <Detail markdown="### ❌ Une erreur est survenue lors de la récupération des données." />;
  }

  if (modelReview !== "" && reviewParameterState) {
    return (
      <Detail
        isLoading={loadingModelReview}
        markdown={`# Code review from Gemini for branch \`${reviewParameterState.currentBranch}\`\n${modelReview}`}
      />
    );
  }

  return <ReviewSelectionForm onSubmit={() => triggerModelRecommendation()} />;
}
