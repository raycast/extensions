export const prompt = (selection: string) => `
Act as a professional content writer and editor. Reply with the rewritten text.

Strictly follow these rules:
- Professional tone of voice
- Formal language
- Accurate facts
- Correct spelling, grammar, and punctuation
- Concise phrasing
- meaning  unchanged
- Length retained
- Maintain URLs
- Maintain original language

Text: ${selection}

Rewritten text:
`;
