import { getPreferenceValues, showToast, Toast, Clipboard, showHUD, LocalStorage } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import fetch from "node-fetch";

interface Preferences {
  claudeApiKey: string;
  claudeModel?: string;
  promptPreset?: string;
  customPrompt?: string;
  preserveLineBreaks?: boolean;
  avoidEmDashes?: boolean;
}

interface ClaudeContentBlock {
  type: string;
  text: string;
}

interface ClaudeAPIResponse {
  id: string;
  type: string;
  role: string;
  content: ClaudeContentBlock[];
  model: string;
  stop_reason: string;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export default async function command() {
  try {
    // Get API key and other preferences
    const preferences = getPreferenceValues<Preferences>();
    const apiKey = preferences.claudeApiKey;
    const selectedModel = preferences.claudeModel || "claude-3-5-sonnet-20241022";
    const promptPreset = preferences.promptPreset || "conversational";
    const customPrompt =
      preferences.customPrompt ||
      "Rewrite this with correct spelling and grammar. Aim to have a conversational and human tone of voice.";
    const preserveLineBreaks = preferences.preserveLineBreaks !== false; // Default to true if undefined
    const avoidEmDashes = preferences.avoidEmDashes !== false; // Default to true if undefined

    if (!apiKey) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Claude API Key Missing",
        message: "Please add your Claude API Key in extension preferences",
      });
      return;
    }

    // Check if this is the first time using the API key
    const hasUsedApiKey = await LocalStorage.getItem("has_used_claude_api_key");

    if (!hasUsedApiKey) {
      // First time using the API key - show welcome message
      await LocalStorage.setItem("has_used_claude_api_key", "true");
      await showHUD("✅ You're ready to rewrite text with Claude! Copy text and run this command again.");
      return;
    }

    // Get clipboard content
    const { stdout: clipboardContent } = await promisify(exec)("pbpaste");

    if (!clipboardContent || clipboardContent.trim() === "") {
      await showToast({
        style: Toast.Style.Failure,
        title: "No text in clipboard",
        message: "Please copy some text before running this command",
      });
      return;
    }

    // Determine which prompt to use based on preset
    let promptToUse = customPrompt;

    if (promptPreset !== "custom") {
      switch (promptPreset) {
        case "conversational":
          promptToUse =
            "Rewrite this with correct spelling and grammar. Aim to have a conversational and human tone of voice.";
          break;
        case "formal":
          promptToUse =
            "Rewrite this with correct spelling and grammar. Use a formal, professional tone suitable for business or academic contexts.";
          break;
        case "concise":
          promptToUse =
            "Rewrite this to be more concise and clear. Remove unnecessary words and simplify complex sentences while maintaining the original meaning.";
          break;
        case "grammar":
          promptToUse =
            "Fix only the spelling and grammar in this text. Don't change the style, tone, or word choice unless necessary for grammatical correctness.";
          break;
      }
    }

    // Show loading indicator
    await showToast({
      style: Toast.Style.Animated,
      title: "Rewriting text...",
      message: `Using ${getModelDisplayName(selectedModel)}`,
    });

    // Prepare system message based on preferences
    let systemMessage =
      "You are a helpful text rewriting assistant. Your job is to take the provided text and rewrite it as instructed";

    if (preserveLineBreaks) {
      systemMessage += " while preserving the original line breaks, paragraph structure, and formatting";
    }

    if (avoidEmDashes) {
      systemMessage += ". Do not use em dashes (—) in your rewrite";
    }

    systemMessage += ". You should return ONLY the rewritten text, with no additional commentary.";

    // Prepare user instructions based on preferences
    let preserveFormatInstructions = "";

    if (preserveLineBreaks || avoidEmDashes) {
      preserveFormatInstructions = "\n\nIMPORTANT INSTRUCTIONS:";
      preserveFormatInstructions +=
        "\n1. Return ONLY the rewritten text without any additional commentary or explanations";

      if (preserveLineBreaks) {
        preserveFormatInstructions += "\n2. Preserve all line breaks and paragraph structure from the original text";
        preserveFormatInstructions += "\n3. Maintain the original formatting (including spacing between paragraphs)";
        preserveFormatInstructions += "\n4. Do not add any headers, footers, or wrapper text";
      }

      if (avoidEmDashes) {
        preserveFormatInstructions += `\n${preserveLineBreaks ? "5" : "2"}. Do not use em dashes (—) in your rewrite. Use other punctuation like commas, parentheses, or colons instead`;
      }
    } else {
      preserveFormatInstructions =
        "\n\nIMPORTANT: Return ONLY the rewritten text without any additional commentary, explanations, or notes.";
    }

    // Make API request to Claude
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: selectedModel,
        max_tokens: 8192,
        system: systemMessage,
        messages: [
          {
            role: "user",
            content: `${promptToUse} Here's the text to rewrite:

${clipboardContent}${preserveFormatInstructions}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Claude API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = (await response.json()) as ClaudeAPIResponse;

    // Extract text from the Claude API response
    let rewrittenText = "No text returned from Claude";

    if (data.content && data.content.length > 0) {
      for (const block of data.content) {
        if (block.type === "text") {
          rewrittenText = block.text;
          break;
        }
      }
    }

    // Copy rewritten text to clipboard
    await Clipboard.copy(rewrittenText);

    // Show success message with model info
    await showHUD(`✅ Text rewritten using ${getModelDisplayName(selectedModel)}`);
  } catch (error) {
    console.error("Error:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Error rewriting text",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

// Helper function to get a human-readable model name
function getModelDisplayName(modelId: string): string {
  switch (modelId) {
    case "claude-3-7-sonnet-20250219":
      return "Claude 3.7 Sonnet";
    case "claude-3-5-sonnet-20241022":
      return "Claude 3.5 Sonnet v2";
    case "claude-3-5-sonnet-20240620":
      return "Claude 3.5 Sonnet";
    default:
      return modelId;
  }
}
