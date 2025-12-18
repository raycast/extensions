import { DictionaryEntry, PronunciationResult } from "../types";

const API_BASE_URL = "https://api.dictionaryapi.dev/api/v2/entries/en";

export async function lookupWord(word: string): Promise<PronunciationResult[]> {
  const response = await fetch(
    `${API_BASE_URL}/${encodeURIComponent(word.trim().toLowerCase())}`,
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Word "${word}" not found in dictionary`);
    }
    throw new Error(`API error: ${response.status}`);
  }

  const data = (await response.json()) as DictionaryEntry[];
  return parseResults(data);
}

function parseResults(entries: DictionaryEntry[]): PronunciationResult[] {
  const results: PronunciationResult[] = [];

  for (const entry of entries) {
    // Get all phonetics with audio
    const phoneticsWithAudio = entry.phonetics.filter(
      (p) => p.audio && p.audio.length > 0,
    );

    // Get the main IPA (prefer one with audio, fallback to entry.phonetic)
    const mainIpa =
      entry.phonetic || entry.phonetics.find((p) => p.text)?.text || "";

    // If we have phonetics with audio, create a result for each unique audio
    if (phoneticsWithAudio.length > 0) {
      for (const phonetic of phoneticsWithAudio) {
        const meaning = entry.meanings[0];
        results.push({
          word: entry.word,
          ipa: phonetic.text || mainIpa,
          audioUrl: phonetic.audio,
          partOfSpeech: meaning?.partOfSpeech,
          definition: meaning?.definitions[0]?.definition,
        });
      }
    } else {
      // No audio available, just show IPA
      const meaning = entry.meanings[0];
      results.push({
        word: entry.word,
        ipa: mainIpa,
        partOfSpeech: meaning?.partOfSpeech,
        definition: meaning?.definitions[0]?.definition,
      });
    }
  }

  // Deduplicate by audio URL (or by IPA if no audio)
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = r.audioUrl || r.ipa || r.word;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
