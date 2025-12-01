import { getPreferenceValues } from "@raycast/api";
import { GoogleGenAI } from "@google/genai";
import { getResearchQueryPrompt, ResearchMode } from "./prompts";

interface Preferences {
  geminiApiKey: string;
  geminiModel: string;
}

export interface SourceResult {
  title: string;
  url: string;
  description: string;
  type: "article" | "blog" | "video" | "book" | "paper" | "other";
}

export interface SearchResult {
  sources: SourceResult[];
  summary: string;
  searchQueries: string[];
}

function getConfig(): Preferences {
  return getPreferenceValues<Preferences>();
}

export async function searchForSources(query: string, mode: ResearchMode = {}): Promise<SearchResult> {
  const { geminiApiKey, geminiModel } = getConfig();

  const ai = new GoogleGenAI({ apiKey: geminiApiKey });

  const researchPrompt = getResearchQueryPrompt(mode);

  const fullPrompt = `${researchPrompt}

---

## Research Query

${query}

---

Find high-quality sources to answer this research question. Search for:
- Blog posts and long-form essays (especially from experts)
- YouTube videos with expert commentary
- Academic papers (open access preferred)
- Books (note author and why it's relevant)
- Podcasts with relevant episodes
- Digital archives and primary sources

For each source, provide:
1. The exact URL (must be real and accessible)
2. Title of the source
3. Brief description of what it covers and why it's valuable
4. Type (article, blog, video, book, paper, other)

Respond with a JSON object in this exact format:
{
  "sources": [
    {
      "title": "Source Title",
      "url": "https://example.com/article",
      "description": "Why this source is valuable and what specific information it provides",
      "type": "blog"
    }
  ],
  "summary": "Brief overview of what you found and how these sources address the query"
}

Important:
- Only include sources you found through search - no hallucinated URLs
- Prioritize quality over quantity (5-15 excellent sources is better than 30 mediocre ones)
- Include a mix of source types when relevant
- For YouTube, include the video URL
- For books, use a link to the book (Google Books, Amazon, or publisher)`;

  const response = await ai.models.generateContent({
    model: geminiModel,
    contents: fullPrompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  // Extract grounding metadata for actual sources
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const searchQueries = response.candidates?.[0]?.groundingMetadata?.webSearchQueries || [];

  // Try to parse the JSON response
  let parsedResult: SearchResult;

  try {
    let jsonStr = response.text?.trim() || "{}";
    jsonStr = jsonStr.replace(/^```(?:json|JSON)?\s*\n/, "").replace(/\n```\s*$/, "");
    parsedResult = JSON.parse(jsonStr);
  } catch {
    // If JSON parsing fails, construct from grounding chunks
    parsedResult = {
      sources: [],
      summary: response.text || "Search completed",
      searchQueries: searchQueries,
    };
  }

  // Merge grounding chunks with parsed sources to ensure we have real URLs
  const groundedSources: SourceResult[] = groundingChunks.map((chunk: { web?: { uri?: string; title?: string } }) => ({
    title: chunk.web?.title || "Untitled",
    url: chunk.web?.uri || "",
    description: "Found via Google Search",
    type: "other" as const,
  }));

  // Combine: prefer parsed sources (more detail) but add any grounded sources not already included
  const seenUrls = new Set(parsedResult.sources?.map((s) => s.url) || []);
  const combinedSources = [...(parsedResult.sources || [])];

  for (const source of groundedSources) {
    if (source.url && !seenUrls.has(source.url)) {
      combinedSources.push(source);
      seenUrls.add(source.url);
    }
  }

  return {
    sources: combinedSources.filter((s) => s.url), // Only include sources with URLs
    summary: parsedResult.summary || "Search completed",
    searchQueries: searchQueries,
  };
}
