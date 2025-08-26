import { AI } from "@raycast/api";
import { ParsedEventDetails, LLMServicePreferences } from "../types";

export async function parseEventDetails(
  input: string,
  preferences: LLMServicePreferences,
): Promise<ParsedEventDetails> {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

  const prompt = `You are a calendar event parser. Convert natural language into structured calendar events.

CRITICAL TIME RULES:
1. Always use the current year ${currentYear} unless explicitly specified otherwise
2. For times like "3pm", "1am", "2:30pm" - use EXACTLY what the user says
3. "3pm" should be 15:00 (3:00 PM), "1am" should be 01:00 (1:00 AM)
4. "1am" means 1:00 AM (early morning), NOT 11:00 PM
5. Use simple ISO8601 format: YYYY-MM-DDTHH:mm:ss (no timezone needed)
6. For relative dates like "tomorrow", calculate from today's date: ${currentDate.toISOString().split("T")[0]}
7. If no duration is specified, use ${preferences.defaultDuration} minutes as the default event duration
8. ${preferences.includeDescription ? "ALWAYS create a helpful description for the event with additional context or details" : "Only include a description if the user specifically provides description details"}

LOCATION RULES:
9. If there is a location mentioned (such as a city, state, or place), you MUST:
   - Fill in the "location" field with the FULL, PROPER location name
   - Expand nicknames/abbreviations: "philly" → "Philadelphia, PA", "NYC" → "New York City, NY", "SF" → "San Francisco, CA"
   - Use proper city, state/country format when possible
   - Also mention the location in the event description for clarity
   - If no location is given, leave the location field empty or undefined

Return ONLY a valid JSON object with this structure:
{
  "title": "Event Title",
  "start": "YYYY-MM-DDTHH:mm:ss",
  "end": "YYYY-MM-DDTHH:mm:ss", 
  "description": "Event description",
  "location": "Location if specified"
}

Input: "${input}"`;

  const response = await AI.ask(prompt, {
    creativity: 0.1,
  });

  try {
    const parsed = JSON.parse(response);
    return {
      title: parsed.title,
      start: parsed.start,
      end: parsed.end,
      description: parsed.description || "",
      location: parsed.location,
    };
  } catch (error) {
    throw new Error(`Failed to parse AI response: ${error}`);
  }
}
