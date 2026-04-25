import { DESCRIPTION_FIELD_MAXLENGTH, NAME_FIELD_MAXLENGTH } from "../constants";

/**
 * Builds the AI prompt for generating colors.
 */
export function composeColorPrompt({
  prompt,
  colorCount,
  creativity,
}: {
  prompt: string;
  colorCount: number;
  creativity: string;
}): string {
  return `Create ${colorCount} colors based on the input prompt.
Return valid HEX colors in a JSON array format, such as ["#66D3BB","#7EDDC6","#96E7D1","#AEEFDB","#C6F9E6"].
Do not include any other text or formatting, just the JSON array of colors.
If you cannot create colors, return an empty JSON array [].

Prompt: ${prompt}

Creativity: ${creativity}

JSON colors:`;
}

/**
 * Builds the AI prompt for generating description.
 */
export function composeDescriptionPrompt({ prompt, creativity }: { prompt: string; creativity: string }): string {
  return `Create a description for the set of created colors, considering the prompt that the user gave.
Importantly, the description must be clear, concise and have a maximum length of 
${DESCRIPTION_FIELD_MAXLENGTH} characters.

Return only the plain text description without any quotes, quotation marks, or special formatting.
Do not wrap the response in quotes or add any punctuation marks around it.

Prompt: ${prompt}

Creativity: ${creativity}
`;
}

/**
 * Builds the AI prompt for generating title.
 */
export function composeTitlePrompt({
  prompt,
  description,
  creativity,
}: {
  prompt: string;
  description: string;
  creativity: string;
}): string {
  return `Create a title for the set of created colors, considering the prompt that the user gave.
Also, consider the description you just created.
Importantly, the title must be clear, concise and have a maximum length of 
${NAME_FIELD_MAXLENGTH} characters.

Return only the plain text title without any quotes, quotation marks, or special formatting.
Do not wrap the response in quotes or add any punctuation marks around it.

Prompt: ${prompt}

Description: ${description}

Creativity: ${creativity}
`;
}
