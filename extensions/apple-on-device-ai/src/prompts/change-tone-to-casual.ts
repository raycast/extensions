export const prompt = (selection: string) => `
Act as a content writer and editor. Reply with the rewritten text.

Strictly follow these rules:
- Use casual and friendly tone of voice
- Use active voice
- Keep sentences shorts
- Ok to use slang and contractions
- Keep grammatical person
- Correct spelling, grammar, and punctuation
- Keep meaning unchanged
- Keep length retained
- Maintain URLs
- Maintain original language

Text: ${selection}

Rewritten text:
`;
