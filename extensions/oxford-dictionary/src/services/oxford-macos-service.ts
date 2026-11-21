import { execFile } from 'child_process';
import { WordResult, MeaningGroup, PartOfSpeech } from '../types/dictionary';

/**
 * Accesses Apple's built-in Oxford Dictionary on macOS via DCSCopyTextDefinition.
 * Returns null if not on macOS or if word is not found.
 */
export async function lookupMacOxford(word: string): Promise<WordResult | null> {
  if (process.platform !== 'darwin') {
    return null;
  }

  return new Promise((resolve) => {
    const cleanWord = word.trim().replace(/['"\\\n\r]/g, '');
    if (!cleanWord) {
      resolve(null);
      return;
    }

    // JXA script querying CoreServices DCSCopyTextDefinition
    const script = `
      ObjC.import('CoreServices');
      var word = "${cleanWord}";
      var range = { location: 0, length: word.length };
      var def = $.DCSCopyTextDefinition(null, word, range);
      if (def) {
        console.log(def.js);
      }
    `;

    execFile('osascript', ['-l', 'JavaScript', '-e', script], { timeout: 3000 }, (err: unknown, stdout: string) => {
      if (err || !stdout || !stdout.trim()) {
        resolve(null);
        return;
      }

      const raw = stdout.trim();
      const parsed = parseOxfordRawText(cleanWord, raw);
      resolve(parsed);
    });
  });
}

function parseOxfordRawText(word: string, text: string): WordResult {
  // Oxford dictionary text format typically contains:
  // word | phonetic | part of speech | definitions...
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  let phonetic: string | undefined;
  const meaningsMap = new Map<PartOfSpeech, { definitions: string[]; examples: string[] }>();

  let currentPos: PartOfSpeech = 'noun';

  const posRegex = /\b(noun|verb|adjective|adverb|pronoun|preposition|conjunction|interjection|exclamation)\b/i;
  const phoneticRegex = /[\/\[][^\/\]]+[\/\]]|·[^·\s]+/;

  for (const line of lines) {
    if (!phonetic) {
      const matchPhone = line.match(phoneticRegex);
      if (matchPhone) {
        phonetic = matchPhone[0];
      }
    }

    const posMatch = line.match(posRegex);
    if (posMatch) {
      const matched = posMatch[1].toLowerCase();
      if (matched === 'exclamation') currentPos = 'interjection';
      else currentPos = matched as PartOfSpeech;
    }

    // Remove numbers and leading bullets
    const cleanDef = line.replace(/^\d+[\.\)]\s*/, '').replace(/^[•\-\*]\s*/, '').trim();
    if (cleanDef && cleanDef.length > 5 && !cleanDef.startsWith('▶') && !cleanDef.startsWith('ORIGIN')) {
      if (!meaningsMap.has(currentPos)) {
        meaningsMap.set(currentPos, { definitions: [], examples: [] });
      }
      const entry = meaningsMap.get(currentPos)!;
      if (entry.definitions.length < 6) {
        entry.definitions.push(cleanDef);
      }
    }
  }

  const meanings: MeaningGroup[] = [];
  for (const [pos, data] of meaningsMap.entries()) {
    meanings.push({
      partOfSpeech: pos,
      definitions: data.definitions.length > 0 ? data.definitions : [text.slice(0, 150)],
      examples: data.examples,
      synonyms: [],
      antonyms: [],
    });
  }

  if (meanings.length === 0) {
    meanings.push({
      partOfSpeech: 'noun',
      definitions: [text.slice(0, 200)],
      examples: [],
      synonyms: [],
      antonyms: [],
    });
  }

  return {
    word,
    phonetic,
    meanings,
    allSynonyms: [],
    allAntonyms: [],
    source: 'oxford',
  };
}
