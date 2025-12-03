export interface Phonetic {
  text: string;
  audio: string;
  sourceUrl?: string;
  accent?: string; // e.g., "US", "UK"
}

export interface Definition {
  definition: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
}

export interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
}

export interface WordData {
  word: string;
  phonetics: Phonetic[];
  meanings: Meaning[];
  sourceUrls?: string[];
}

export interface ApiResponse {
  success: boolean;
  data?: WordData;
  error?: string;
  suggestions?: string[];
}

/**
 * Fetch word data from Free Dictionary API
 */
async function fetchFromFreeDictionary(word: string): Promise<ApiResponse> {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          error: "Word not found",
        };
      }
      throw new Error(`API responded with status ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return {
        success: false,
        error: "No data found",
      };
    }

    const wordEntry = data[0];

    // Process phonetics: remove duplicates and detect accents
    const phoneticsMap = new Map<string, Phonetic>();

    wordEntry.phonetics?.forEach((p: { text?: string; audio?: string; sourceUrl?: string }) => {
      if (!p.audio && !p.text) return; // Skip empty entries

      // Detect accent from audio URL
      let accent = "";
      if (p.audio) {
        if (p.audio.includes("-us.mp3") || p.audio.includes("-au.mp3")) {
          accent = "US";
        } else if (p.audio.includes("-uk.mp3")) {
          accent = "UK";
        }
      }

      // Create unique key based on text and accent
      const key = `${p.text || ""}_${accent}`;

      // Only add if not already added, prioritize entries with audio
      if (!phoneticsMap.has(key) || (p.audio && !phoneticsMap.get(key)?.audio)) {
        phoneticsMap.set(key, {
          text: p.text || "",
          audio: p.audio || "",
          sourceUrl: p.sourceUrl,
          accent,
        });
      }
    });

    const wordData: WordData = {
      word: wordEntry.word || word,
      phonetics: Array.from(phoneticsMap.values()).filter((p) => p.audio), // Only keep phonetics with audio
      meanings:
        wordEntry.meanings?.map(
          (m: {
            partOfSpeech: string;
            definitions: { definition: string; example?: string; synonyms?: string[]; antonyms?: string[] }[];
          }) => ({
            partOfSpeech: m.partOfSpeech,
            definitions: m.definitions.map((d) => ({
              definition: d.definition,
              example: d.example,
              synonyms: d.synonyms,
              antonyms: d.antonyms,
            })),
          }),
        ) || [],
      sourceUrls: wordEntry.sourceUrls || [],
    };

    return {
      success: true,
      data: wordData,
    };
  } catch (error) {
    console.error("Free Dictionary API error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get suggestions for similar words
 */
async function getSuggestions(word: string): Promise<string[]> {
  try {
    const response = await fetch(`https://api.datamuse.com/sug?s=${encodeURIComponent(word)}&max=5`);
    if (!response.ok) {
      return [];
    }
    const data = (await response.json()) as Array<{ word: string }>;
    return data.map((item) => item.word);
  } catch (error) {
    console.error("Suggestions API error:", error);
    return [];
  }
}

/**
 * Main function to fetch word data with suggestions
 */
export async function fetchWordData(word: string): Promise<ApiResponse> {
  // Try Free Dictionary API
  const freeDictResult = await fetchFromFreeDictionary(word);

  if (freeDictResult.success) {
    return freeDictResult;
  }

  // If it fails, get suggestions
  const suggestions = await getSuggestions(word);

  return {
    success: false,
    error: `Cannot find the word "${word}"`,
    suggestions,
  };
}
