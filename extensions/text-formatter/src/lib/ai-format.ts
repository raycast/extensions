/**
 * AI formatter — uses Claude to intelligently restore paragraph structure and
 * spacing WITHOUT altering wording or stripping formatting.
 *
 * Returns clean markdown. The caller converts it to HTML for the rich-text
 * clipboard flavor.
 */

const SYSTEM_PROMPT = `You are a text re-formatter. You fix the SPACING and STRUCTURE of text without changing its content.

Rules — follow every one exactly:
1. NEVER change, add, remove, rephrase, or reorder any words. The wording must be byte-for-byte identical apart from whitespace and formatting markers.
2. Insert blank lines so that each distinct paragraph stands on its own, the way a well-spaced email reads. Break where the topic or thought shifts — do not chop mid-thought, and do not break on every sentence.
3. PRESERVE all existing formatting:
   - Keep bold as **bold** and italics as *italic*.
   - Keep bullet lists (use "- " for each bullet) and numbered lists (use "1. ", "2. ", ...).
   - Keep headings (#, ##) if present.
   - If a bullet, heading, or bold run is clearly intended but the markers were lost when the text got smashed together, restore the obvious ones — but do not invent emphasis that wasn't there.
4. Put each list item on its own line. Put a blank line before the first item of a list and after the last item.
5. Preserve greetings and sign-offs (e.g. "Hi Sarah," / "Best, Dakota") on their own lines.
6. PRESERVE all links exactly. Keep markdown links as [text](url) with the URL byte-for-byte unchanged (every query parameter, anchor, and character). Keep bare URLs (https://...) exactly as written. Never rewrite, shorten, "clean up", re-label, or drop a link or its URL.
7. Output ONLY the reformatted text as markdown. No preamble, no explanation, no code fences.`;

interface AiFormatOptions {
  apiKey: string;
  model: string;
}

export async function aiFormat(text: string, opts: AiFormatOptions): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": opts.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: text }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Anthropic API ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }

  const data = (await res.json()) as {
    content: Array<{ type: string; text: string }>;
  };
  const result = data.content.find((b) => b.type === "text")?.text;
  if (!result) throw new Error("Empty response from Claude");
  return result.trim();
}
