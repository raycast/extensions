import { analyzeImage } from "./analyze-image";
import { analyzeWebPageText, buildWebPageUserMessage } from "./analyze-text";
import { getActiveBrowserTab } from "./browser-tab";
import { continueConversation, type ChatTurn, type SessionContext } from "./continue-chat";
import { fetchPageAsPlainText } from "./fetch-page-text";
import { parseModelPreference } from "./model";
import type { TokenUsage } from "./token-usage";

function parseInstructionsFromBrowserUserMessage(content: string): string {
  const parts = content.split("\n\n---\n");
  return parts[0]?.trim() || content.trim();
}

/**
 * Re-runs the last model turn: vision first message, browser first message (re-fetches current tab), or multi-turn `continueConversation`.
 */
export async function regenerateLastTurn(
  prefs: Preferences,
  sessionModel: string,
  messages: ChatTurn[],
  session: SessionContext,
): Promise<{ messages: ChatTurn[]; usage: TokenUsage | null }> {
  if (messages.length < 2 || messages[messages.length - 1].role !== "assistant") {
    throw new Error("Nothing to regenerate.");
  }

  const threadMinusAssistant = messages.slice(0, -1);
  const lastUser = threadMinusAssistant[threadMinusAssistant.length - 1];
  if (!lastUser || lastUser.role !== "user") {
    throw new Error("Invalid thread for regeneration.");
  }

  const parsed = parseModelPreference(sessionModel.trim() || "openai:gpt-4o-mini");

  if (threadMinusAssistant.length === 1 && session.source === "screen") {
    const { text, usage } = await analyzeImage(
      prefs,
      parsed,
      session.screenBase64,
      lastUser.content,
      session.screenMediaType ?? "image/png",
    );
    return {
      messages: [...threadMinusAssistant, { role: "assistant", content: text }],
      usage: usage ?? null,
    };
  }

  if (threadMinusAssistant.length === 1 && session.source === "browser") {
    const tab = await getActiveBrowserTab();
    const pageText = await fetchPageAsPlainText(tab.url);
    const instructions = parseInstructionsFromBrowserUserMessage(lastUser.content);
    const { text, usage } = await analyzeWebPageText(prefs, parsed, instructions, tab, pageText);
    const userDisplay = buildWebPageUserMessage(instructions, tab, pageText);
    return {
      messages: [
        { role: "user", content: userDisplay },
        { role: "assistant", content: text },
      ],
      usage: usage ?? null,
    };
  }

  const { text, usage } = await continueConversation(prefs, parsed, session, threadMinusAssistant);
  return {
    messages: [...threadMinusAssistant, { role: "assistant", content: text }],
    usage: usage ?? null,
  };
}
