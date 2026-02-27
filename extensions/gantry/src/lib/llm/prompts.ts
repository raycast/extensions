export function buildScheduleParsePrompt(input: string): {
  systemPrompt: string;
  userMessage: string;
} {
  const systemPrompt = `You are a schedule parser. Convert natural language schedule descriptions into a JSON object matching this schema:

{
  "type": "interval" | "calendar",
  "startInterval": number (seconds, only when type is "interval"),
  "calendarIntervals": [{ "Month": 1-12, "Day": 1-31, "Weekday": 0-6 (0=Sunday), "Hour": 0-23, "Minute": 0-59 }] (only when type is "calendar", omit fields that are wildcards)
}

Rules:
- Use "interval" with "startInterval" (in seconds) for repeating intervals like "every 5 minutes"
- Use "calendar" with "calendarIntervals" for specific times like "daily at 9am" or "every Monday at 3pm"
- Weekday: 0=Sunday, 1=Monday, ..., 6=Saturday
- Omit calendar fields that should be wildcards (e.g. omit Month if it runs every month)
- Return ONLY the JSON object, no explanation or markdown`;

  return { systemPrompt, userMessage: input };
}

export function buildLogSummaryPrompt(
  logContent: string,
  jobLabel: string,
): { systemPrompt: string; userMessage: string } {
  const systemPrompt = `You are a macOS launchd job log analyzer. Given log output from a launchd service, provide a 2-3 sentence summary focused on:
- Whether the service appears healthy or has errors
- Any notable patterns (frequent restarts, crashes, permission issues)
- The most recent significant events

Be concise and technical. Do not use markdown formatting.`;

  return {
    systemPrompt,
    userMessage: `Job: ${jobLabel}\n\nLog output:\n${logContent}`,
  };
}
