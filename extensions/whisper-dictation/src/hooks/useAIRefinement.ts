import { useCallback, type Dispatch, type SetStateAction } from "react";
import { AI, LocalStorage, environment, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

const AI_PROMPTS_KEY = "aiPrompts";
const ACTIVE_PROMPT_ID_KEY = "activePromptId";

// Get active prompt from LocalStorage
interface AIPrompt {
  id: string;
  name: string;
  prompt: string;
  isDefault?: boolean;
}
async function getActivePrompt(): Promise<AIPrompt> {
  const activePromptId = (await LocalStorage.getItem<string>(ACTIVE_PROMPT_ID_KEY)) || "default";
  const promptsJson = await LocalStorage.getItem<string>(AI_PROMPTS_KEY);

  let prompts: AIPrompt[] = [];
  if (promptsJson) {
    try {
      prompts = JSON.parse(promptsJson) as AIPrompt[];
    } catch (e) {
      console.error("Failed to parse AI prompts from LocalStorage:", e);
      prompts = []; // Reset if parse fails
    }
  }

  // Default prompt if none configured or parse failed
  if (!prompts || prompts.length === 0) {
    prompts = [
      {
        id: "default",
        name: "Email Format",
        prompt:
          "Reformat this dictation as a professional email. Do not include a subject line. Keep all facts and information from the original text. Add appropriate greeting and signature if needed.",
        isDefault: true,
      },
    ];
    // Optionally save default prompts if none exist
    await LocalStorage.setItem(AI_PROMPTS_KEY, JSON.stringify(prompts));
    await LocalStorage.setItem(ACTIVE_PROMPT_ID_KEY, "default");
  }
  // Find active prompt or fallback to first
  const activePrompt = prompts.find((p) => p.id === activePromptId) || prompts[0];
  return activePrompt;
}

// Helper for Raycast AI refinement
async function refineWithRaycastAI(
  text: string,
  modelId: string,
  setAiErrorMessage: Dispatch<SetStateAction<string>>,
): Promise<string> {
  try {
    const activePrompt = await getActivePrompt();
    const refined = await AI.ask(`${activePrompt.prompt}\n\nText to refine: "${text}"`, {
      model: AI.Model[modelId as keyof typeof AI.Model] || AI.Model["OpenAI_GPT4o-mini"],
      creativity: "medium",
    });
    return refined.trim();
  } catch (error) {
    console.error("Raycast AI refinement failed:", error);
    const errorMessage =
      error instanceof Error
        ? `Raycast AI refinement failed: ${error.message}`
        : "Raycast AI refinement failed: Unknown error";
    setAiErrorMessage(errorMessage);
    throw error; // Re-throw to be caught by caller
  }
}

// Helper for Ollama refinement
async function refineWithOllama(
  text: string,
  endpoint: string,
  model: string,
  apiKey: string | undefined,
  setAiErrorMessage: Dispatch<SetStateAction<string>>,
): Promise<string> {
  try {
    const activePrompt = await getActivePrompt();
    const baseEndpoint = endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;
    const ollamaUrl = `${baseEndpoint}/v1/chat/completions`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(ollamaUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: activePrompt.prompt },
          { role: "user", content: text },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Ollama API error (${response.status}): ${errorText}`);
      const errorMessage = `Ollama API error (${response.status}): ${errorText}`;
      setAiErrorMessage(errorMessage);
      throw new Error(errorMessage);
    }

    const data = await response.json();

    if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
      return data.choices[0].message.content.trim();
    } else {
      console.error("Unexpected Ollama response structure:", data);
      const errorMessage = "Unexpected response structure from Ollama API.";
      setAiErrorMessage(errorMessage);
      throw new Error("Failed to parse response from Ollama.");
    }
  } catch (error) {
    console.error("Ollama refinement failed:", error);
    let errorMessage = error instanceof Error ? error.message : "Unknown error";
    if (error instanceof TypeError && error.message.includes("fetch")) {
      errorMessage = `Could not connect to the Ollama server at ${endpoint}. Please ensure it's running and accessible.`;
    } else if (error instanceof Error && typeof error.message === "string") {
      if (error.message.includes("401")) {
        errorMessage = "Invalid API key or authentication error with the Ollama server.";
      } else if (error.message.includes("403")) {
        errorMessage = "Your API key doesn't have permission to access this resource.";
      }
    }
    setAiErrorMessage(`Ollama refinement failed: ${errorMessage}`);
    throw error; // Re-throw to be caught by caller
  }
}

/**
 * Hook to manage AI text refinement logic.
 * @param setAiErrorMessage - Setter for AI-specific error messages.
 * @returns An object containing the `refineText` function.
 */
export function useAIRefinement(setAiErrorMessage: Dispatch<SetStateAction<string>>) {
  const preferences = getPreferenceValues<Preferences>();

  const refineText = useCallback(
    async (text: string): Promise<string> => {
      if (preferences.aiRefinementMethod === "disabled") {
        return text;
      }

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Refining with AI...",
      });

      try {
        setAiErrorMessage(""); // Clear previous AI errors
        let refinedText: string;

        if (preferences.aiRefinementMethod === "raycast") {
          if (!environment.canAccess("AI")) {
            const msg = "Raycast Pro subscription required for AI features.";
            setAiErrorMessage(msg);
            showFailureToast(new Error(msg), { title: "AI Access Denied" });
            return text; // Return og text
          }
          refinedText = await refineWithRaycastAI(text, preferences.aiModel, setAiErrorMessage);
        } else {
          // Use Ollama
          refinedText = await refineWithOllama(
            text,
            preferences.ollamaEndpoint,
            preferences.ollamaModel,
            preferences.ollamaApiKey,
            setAiErrorMessage,
          );
        }

        toast.style = Toast.Style.Success;
        toast.title = "AI Refinement Complete";
        return refinedText;
      } catch (error) {
        console.error("AI refinement failed in refineText:", error);
        showFailureToast(error, { title: "AI Refinement Failed" });
        return text; // Return og text
      }
    },
    [
      preferences.aiRefinementMethod,
      preferences.aiModel,
      preferences.ollamaEndpoint,
      preferences.ollamaModel,
      preferences.ollamaApiKey,
      setAiErrorMessage,
    ],
  );

  return { refineText };
}
