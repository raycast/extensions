import { AI } from "@raycast/api";

export interface ParsedFlight {
  originLocation?: string; // City or airport name (not IATA code)
  destinationLocation?: string; // City or airport name (not IATA code)
  departureDate?: string; // YYYY-MM-DD format
  returnDate?: string; // YYYY-MM-DD format
  adults?: number;
  stops?: "any" | "direct" | "multiStop";
  error?: string;
}

/**
 * Parse a free text flight query using Raycast AI
 * Examples:
 * - "New York to London tomorrow"
 * - "JFK to LAX next Monday returning Friday"
 * - "flight from San Francisco to Tokyo Dec 25"
 * - "Paris to Rome in 2 weeks for 2 people"
 */
export async function parseFreeTextQuery(text: string): Promise<ParsedFlight> {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD format

  const prompt = `You are a flight search parser. Parse the following flight search query and extract information.

Current date: ${todayStr}

User query: "${text}"

Extract and return ONLY a valid JSON object (no markdown, no code blocks, no explanations) with these fields:
{
  "originLocation": "city name or airport name (NOT IATA code)",
  "destinationLocation": "city name or airport name (NOT IATA code)",
  "departureDate": "YYYY-MM-DD format or empty string if not found",
  "returnDate": "YYYY-MM-DD format or empty string if not found (only if return trip is mentioned)",
  "adults": number (1-8, default 1 if not specified),
  "stops": "any" | "direct" | "multiStop" (default "any" if not mentioned)
}

Rules:
- For locations, return the CITY NAME or full location name (e.g., "New York", "London", "San Francisco")
- If user provides IATA code (e.g., "JFK"), convert it to the city name (e.g., "New York")
- Parse dates in various formats: "Nov 11", "November 11", "11 Nov", "11th November", "11/11", etc.
- Parse "on [date]" format (e.g., "on Nov 11" means departure date is Nov 11)
- Parse relative dates like "tomorrow", "next week", "in 3 days" relative to ${todayStr}
- If "return", "round trip", or "returning" is mentioned, extract returnDate
- Default adults to 1 if not mentioned
- For stops: if "direct", "non-stop", or "nonstop" is mentioned, return "direct"; if "with stops" or "connecting" is mentioned, return "multiStop"; otherwise return "any"
- Return empty strings for fields that cannot be determined
- CRITICAL: Return ONLY the raw JSON object, no markdown formatting, no \`\`\`json blocks, nothing else`;

  try {
    const response = await AI.ask(prompt, {
      creativity: "none", // We want precise, deterministic parsing
    });

    // Clean up the response - remove markdown code blocks if present
    let cleanResponse = response.trim();
    if (cleanResponse.startsWith("```")) {
      cleanResponse = cleanResponse.replace(/```json?\n?/g, "").replace(/```\n?$/g, "");
    }
    // Remove any leading/trailing text that's not part of the JSON
    const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanResponse = jsonMatch[0];
    }

    const parsed = JSON.parse(cleanResponse) as ParsedFlight;

    // Validate and clean the parsed data
    if (parsed.originLocation) {
      parsed.originLocation = parsed.originLocation.trim();
    }
    if (parsed.destinationLocation) {
      parsed.destinationLocation = parsed.destinationLocation.trim();
    }
    if (parsed.adults && (parsed.adults < 1 || parsed.adults > 8)) {
      parsed.adults = 1;
    }
    if (!parsed.adults) {
      parsed.adults = 1;
    }
    if (!parsed.stops || !["any", "direct", "multiStop"].includes(parsed.stops)) {
      parsed.stops = "any";
    }

    return parsed;
  } catch (error) {
    // Return partial results with error - don't lose any parsed data
    return {
      error: error instanceof Error ? error.message : "Failed to parse query",
      adults: 1,
      stops: "any",
    };
  }
}
