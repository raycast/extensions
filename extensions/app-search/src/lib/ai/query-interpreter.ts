/**
 * AI-powered query interpretation
 * Uses Raycast AI to understand user intent and suggest apps from installed list
 */

import { AI, environment, Application } from "@raycast/api";
import { APP_CATEGORIES } from "../data/app-database";

export interface QueryInterpretation {
  originalQuery: string;
  interpretedIntent: string;
  suggestedCategories: string[];
  suggestedAppNames: string[];
  searchTerms: string[];
}

/**
 * Use AI to interpret the user's search query with installed apps list
 */
export async function interpretQuery(
  query: string,
  installedApps: Pick<Application, "name" | "bundleId">[],
): Promise<QueryInterpretation> {
  // Check if AI is available
  if (!environment.canAccess(AI)) {
    // Fallback to simple interpretation
    console.warn("AI not available, using simple interpretation.");
    return simpleInterpretation(query);
  }

  try {
    // Create a formatted list of installed apps for AI
    const appList = installedApps
      .map((app, index) => `${index + 1}. ${app.name}${app.bundleId ? ` (${app.bundleId})` : ""}`)
      .join("\n");

    const categoryList = Object.keys(APP_CATEGORIES).join(", ");

    const prompt = `You are helping a user find an application on their Mac.

User query: "${query}"

INSTALLED APPLICATIONS ON THIS MAC:
${appList}

Available categories: ${categoryList}

IMPORTANT: You must ONLY suggest apps from the installed applications list above. Do not suggest apps that are not in the list.

Based on the user's query, provide a JSON response with:
1. interpretedIntent: What the user is looking for (in English)
2. suggestedCategories: Array of relevant category names (max 3)
3. suggestedAppNames: Array of app names from the INSTALLED list above that match (max 5)
4. searchTerms: Array of search keywords to use (max 3)

Response must be valid JSON only, no markdown formatting.

Example for query "メール書くアプリ" if Mail and Thunderbird are installed:
{
  "interpretedIntent": "email client application",
  "suggestedCategories": ["email"],
  "suggestedAppNames": ["Mail", "Thunderbird"],
  "searchTerms": ["mail", "email"]
}`;

    const response = await AI.ask(prompt, {
      creativity: "low", // More precise for concrete task
      model: "anthropic-claude-sonnet",
    });

    // Parse AI response
    const parsed = parseAIResponse(response);
    return {
      originalQuery: query,
      ...parsed,
    };
  } catch (error) {
    console.error("AI interpretation failed:", error);
    // Fallback to simple interpretation
    return simpleInterpretation(query);
  }
}

/**
 * Parse AI response (handles both JSON and text responses)
 */
function parseAIResponse(response: string): Omit<QueryInterpretation, "originalQuery"> {
  try {
    // Try to extract JSON from response (handle markdown code blocks)
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || response.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : response;
    const parsed = JSON.parse(jsonStr);

    return {
      interpretedIntent: parsed.interpretedIntent || "",
      suggestedCategories: Array.isArray(parsed.suggestedCategories) ? parsed.suggestedCategories : [],
      suggestedAppNames: Array.isArray(parsed.suggestedAppNames) ? parsed.suggestedAppNames : [],
      searchTerms: Array.isArray(parsed.searchTerms) ? parsed.searchTerms : [],
    };
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    return {
      interpretedIntent: "",
      suggestedCategories: [],
      suggestedAppNames: [],
      searchTerms: [],
    };
  }
}

/**
 * Simple fallback interpretation without AI
 */
function simpleInterpretation(query: string): QueryInterpretation {
  const lowerQuery = query.toLowerCase();
  const suggestedCategories: string[] = [];
  const searchTerms = [query];

  // Simple keyword matching
  for (const [categoryId, category] of Object.entries(APP_CATEGORIES)) {
    if (category.keywords.some((keyword) => lowerQuery.includes(keyword.toLowerCase()))) {
      suggestedCategories.push(categoryId);
    }
  }

  return {
    originalQuery: query,
    interpretedIntent: query,
    suggestedCategories: suggestedCategories.slice(0, 3),
    suggestedAppNames: [],
    searchTerms,
  };
}
