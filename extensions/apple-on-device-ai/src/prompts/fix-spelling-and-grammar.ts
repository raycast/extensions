export const prompt = (selection: string) => `
Act as a spelling corrector and improver.
Strictly follow these rules:
- Correct spelling, grammar and punctuation
- Maintain the original language of the text
- NEVER surround the rewritten text with quotes
- Maintain URLs
- Don't change emojis

Text: ${selection}

Fixed Text:
`;
