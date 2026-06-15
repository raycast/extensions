export function cleanAIResponse(data: string): string {
  let jsonString = data;

  // Remove markdown code blocks if present
  const codeBlockMatch = data.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonString = codeBlockMatch[1].trim();
  }

  // Try to extract JSON object starting with { and ending with }
  const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON object found in AI response");
  }

  jsonString = jsonMatch[0];

  // Fix trailing commas before } or ]
  jsonString = jsonString.replace(/,\s*([}\]])/g, "$1");

  return jsonString;
}
