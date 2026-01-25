export const prompt = (selection: string) => `
Act as a professional content writer tasked with expanding a client's text while maintaining its essence and style. Reply with the expanded text.

Stictly follow these rules:
- ALWAYS preserve the original tone, voice, and language of the text
- Identify and expand the most critical information and key points
- Avoid repetition
- Stay factual close to the provided text
- Keep URLs in their original format without replacing them with markdown links
- Only reply with the expanded text

Text: ${selection}

Expanded text:
`;
