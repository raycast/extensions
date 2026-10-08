import { AI, environment } from "@raycast/api";
import type { AiPrompt, Group, SuggestionResponse, SupportedLanguage } from "../types";
import { createApiClient } from "../api";

export type AISuggestionSource = "raycast" | "polidict";

export interface AISuggestionResult {
  suggestion: SuggestionResponse;
  source: AISuggestionSource;
}

function buildGroupsContext(groups: Group[]): string {
  if (groups.length === 0) return "";

  const groupsList = groups
    .map((g) => `- "${g.id}": ${g.name}${g.description ? ` (${g.description})` : ""}`)
    .join("\n");

  return `\nAvailable groups to categorize this word (select 0-3 most relevant):\n${groupsList}`;
}

function buildPrompt(
  text: string,
  targetLanguage: SupportedLanguage,
  nativeLanguage: SupportedLanguage | undefined,
  availableGroups: Group[] = [],
): string {
  const translationPart = nativeLanguage ? ` Translate definitions to ${nativeLanguage.languageName}.` : "";
  const groupsPart = buildGroupsContext(availableGroups);

  return `Define "${text}" in ${targetLanguage.languageName}.${translationPart}${groupsPart}
Return ONLY valid JSON with this exact structure:
{"text":"${text}","definitions":[{"definition":"...","translation":"...","examples":["..."]}],"groupIds":["id1","id2"]}
No markdown, no explanation, just the JSON object.`;
}

function parseAIResponse(response: string): SuggestionResponse | undefined {
  try {
    return JSON.parse(response) as SuggestionResponse;
  } catch {
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch?.[1]) {
      try {
        return JSON.parse(jsonMatch[1].trim()) as SuggestionResponse;
      } catch {
        // Fall through
      }
    }

    const objectMatch = response.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]) as SuggestionResponse;
      } catch {
        // Fall through
      }
    }
  }
  return undefined;
}

async function getRaycastAISuggestion(
  text: string,
  targetLanguage: SupportedLanguage,
  nativeLanguage: SupportedLanguage | undefined,
  availableGroups: Group[] = [],
): Promise<SuggestionResponse | undefined> {
  const prompt = buildPrompt(text, targetLanguage, nativeLanguage, availableGroups);

  const response = await AI.ask(prompt, {
    model: AI.Model["Anthropic_Claude_4.5_Haiku"],
    creativity: "low",
  });

  return parseAIResponse(response);
}

async function getPolidictAISuggestion(
  text: string,
  targetLanguage: SupportedLanguage,
  availableGroups: Group[] = [],
): Promise<SuggestionResponse | undefined> {
  const client = createApiClient();
  return client.suggestions.getSuggestion(targetLanguage, {
    text,
    groupIds: availableGroups.map((g) => g.id),
  });
}

export interface AISuggestionOptions {
  isPlusUser?: boolean;
  availableGroups?: Group[];
}

export async function getAISuggestion(
  text: string,
  targetLanguage: SupportedLanguage,
  nativeLanguage: SupportedLanguage | undefined,
  options: AISuggestionOptions = {},
): Promise<AISuggestionResult | undefined> {
  const { isPlusUser = false, availableGroups = [] } = options;

  if (environment.canAccess(AI)) {
    try {
      const suggestion = await getRaycastAISuggestion(text, targetLanguage, nativeLanguage, availableGroups);
      if (suggestion?.definitions?.length) {
        return { suggestion, source: "raycast" };
      }
    } catch (error) {
      console.error("Raycast AI suggestion failed:", error);
    }
  }

  if (isPlusUser) {
    try {
      const suggestion = await getPolidictAISuggestion(text, targetLanguage, availableGroups);
      if (suggestion?.definitions?.length) {
        return { suggestion, source: "polidict" };
      }
    } catch (error) {
      console.error("Polidict AI suggestion failed:", error);
    }
  }

  return undefined;
}

export function canAccessAI(isPlusUser: boolean): boolean {
  return environment.canAccess(AI) || isPlusUser;
}

export async function executeAiPrompt(aiPrompt: AiPrompt): Promise<SuggestionResponse | undefined> {
  if (!environment.canAccess(AI)) {
    return undefined;
  }

  try {
    const prompt = `${aiPrompt.systemMessage}\n\n${aiPrompt.userMessage}`;
    const response = await AI.ask(prompt, {
      model: AI.Model["Anthropic_Claude_4.5_Haiku"],
      creativity: "low",
    });

    return parseAIResponse(response);
  } catch (error) {
    console.error("Raycast AI prompt execution failed:", error);
    return undefined;
  }
}
