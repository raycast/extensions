export const prompt = (selection: string) => `
Act as a content writer and editor. Reply with the rewritten text.

Strictly follow these rules:
- Use confident, formal and friendly tone of voice
- Avoid hedging, be definite where possible
- Skip apologies
- Focus on main arguments
- Correct spelling, grammar, and punctuation
- Keep meaning unchanged
- Keep length retained
- Maintain URLs
- Maintain original language

Text: ${selection}

Rewritten text:
`;
