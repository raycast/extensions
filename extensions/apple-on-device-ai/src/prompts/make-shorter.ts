export const prompt = (selection: string) => `
Act as a professional content writer tasked with shortening a client's text while maintaining its essence and style. Reply with the shortend text.

Strictly follow these rules:
- ALWAYS preserve the original tone, voice, and language of the text
- Identify and retain the most critical information and key points
- Eliminate redundancies and repetitive phrases or sentences
- Keep URLs in their original format without replacing them with markdown links
- Ensure the shortened text flows smoothly and maintains coherence
- Aim to reduce the word count as much as possible without compromising the core meaning and style
- Only reply with the shortend text

Text: ${selection}

Shortened text:
`;
