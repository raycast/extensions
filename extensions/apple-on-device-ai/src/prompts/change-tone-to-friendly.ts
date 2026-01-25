export const prompt = (selection: string) => `
Act as a content writer and editor. Reply with the rewritten text.

Strictly follow these rules:
- Friendly and optimistic tone of voice
- Correct spelling, grammar, and punctuation
- Meaning unchanged
- Length retained
- Maintain URLs
- Maintain original language

Text: ${selection}

Rewritten text:
`;
