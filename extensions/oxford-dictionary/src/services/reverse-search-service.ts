import https from 'https';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { ReverseSearchResult, ExtensionPreferences, PartOfSpeech } from '../types/dictionary';
import { NICHE_VOCABULARY, searchNicheVocabulary } from '../data/niche-vocabulary';

const memoryCache = new Map<string, ReverseSearchResult[]>();

function getCandidateWordNetDirs(): string[] {
  return [
    path.join(__dirname, '..', '..', 'assets', 'wordnet-db'),
    path.join(__dirname, '..', 'assets', 'wordnet-db'),
    path.join(__dirname, 'assets', 'wordnet-db'),
    path.join(__dirname, 'node_modules', 'db'),
    'C:/Users/Johno/.config/raycast/extensions/oxford-dictionary/assets/wordnet-db',
  ];
}

function findWordNetDir(): string | null {
  for (const dir of getCandidateWordNetDirs()) {
    if (fs.existsSync(path.join(dir, 'data.noun'))) {
      return dir;
    }
  }
  return null;
}

function parseFrequency(tags?: string[]): number {
  if (!tags || !Array.isArray(tags)) return 1.0;
  for (const t of tags) {
    if (t.startsWith('f:')) {
      const val = parseFloat(t.slice(2));
      if (!isNaN(val)) return val;
    }
  }
  return 1.0;
}

function parseDatamuseItem(item: any): ReverseSearchResult {
  let pos: PartOfSpeech = 'noun';
  let definition = '';

  if (item.tags && Array.isArray(item.tags)) {
    if (item.tags.includes('v')) pos = 'verb';
    else if (item.tags.includes('adj')) pos = 'adjective';
    else if (item.tags.includes('adv')) pos = 'adverb';
    else if (item.tags.includes('n')) pos = 'noun';
  }

  if (item.defs && Array.isArray(item.defs) && item.defs.length > 0) {
    const rawDef = item.defs[0];
    const parts = rawDef.split('\t');
    if (parts.length >= 2) {
      definition = parts[1].trim();
      const p = parts[0].trim();
      if (p === 'v') pos = 'verb';
      else if (p === 'adj') pos = 'adjective';
      else if (p === 'adv') pos = 'adverb';
      else if (p === 'n') pos = 'noun';
    } else {
      definition = rawDef.trim();
    }
  }

  const f = parseFrequency(item.tags);
  let adjustedScore = item.score || 0;
  if (f < 0.05) adjustedScore *= 1.8;
  else if (f < 0.2) adjustedScore *= 1.5;
  else if (f < 1.0) adjustedScore *= 1.25;

  return {
    word: item.word,
    score: Math.round(adjustedScore),
    partOfSpeech: pos,
    definition: definition || undefined,
    source: 'online',
  };
}

function fetchDatamuse(queryString: string, limit = 40): Promise<ReverseSearchResult[]> {
  return new Promise((resolve) => {
    const fetchMax = Math.max(150, limit * 4);
    const url = `https://api.datamuse.com/words?ml=${encodeURIComponent(queryString)}&md=dpfs&max=${fetchMax}`;
    const req = https.get(url, { timeout: 3500 }, (res) => {
      if (res.statusCode !== 200) {
        resolve([]);
        return;
      }
      let rawData = '';
      res.on('data', (chunk) => {
        rawData += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(rawData);
          if (Array.isArray(json)) {
            resolve(json.map(parseDatamuseItem));
          } else {
            resolve([]);
          }
        } catch {
          resolve([]);
        }
      });
    });

    req.on('error', () => resolve([]));
    req.on('timeout', () => {
      req.destroy();
      resolve([]);
    });
  });
}

/**
 * Fast offline WordNet reverse search:
 * Scans WordNet definition glosses and curated Niche Vocabulary for phrase and keyword matches.
 */
export async function searchOfflineReverse(query: string, maxResults = 30): Promise<ReverseSearchResult[]> {
  const qLower = query.toLowerCase().trim();
  const cleanKeywords = qLower
    .replace(/^(to|a|an|the|of)\s+/, '')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const hits: ReverseSearchResult[] = [];
  const seenWords = new Set<string>();

  // 1. Check curated Niche Vocabulary Bank first
  const nicheMatches = searchNicheVocabulary(cleanKeywords);
  for (const n of nicheMatches) {
    if (!seenWords.has(n.word.toLowerCase()) && n.matchScore >= 4) {
      seenWords.add(n.word.toLowerCase());
      hits.push({
        word: n.word,
        score: Math.round(n.matchScore * 1000),
        partOfSpeech: n.partOfSpeech,
        definition: n.definition,
        source: 'offline',
      });
    }
  }

  const wordnetDir = findWordNetDir();
  if (!wordnetDir) return hits;

  const files = ['data.verb', 'data.noun', 'data.adj', 'data.adv'];
  for (const f of files) {
    const fullPath = path.join(wordnetDir, f);
    if (!fs.existsSync(fullPath)) continue;

    const pos: PartOfSpeech =
      f === 'data.verb'
        ? 'verb'
        : f === 'data.adj'
        ? 'adjective'
        : f === 'data.adv'
        ? 'adverb'
        : 'noun';

    try {
      const rl = readline.createInterface({
        input: fs.createReadStream(fullPath),
        crlfDelay: Infinity,
      });

      for await (const line of rl) {
        if (line.startsWith('  ')) continue;
        const barIndex = line.indexOf('|');
        if (barIndex === -1) continue;

        const gloss = line.slice(barIndex + 1).trim();
        const glossLower = gloss.toLowerCase();

        let score = 0;
        if (glossLower.includes(qLower)) {
          score = 100;
        } else if (cleanKeywords.length > 0) {
          const matched = cleanKeywords.filter((k) => glossLower.includes(k));
          if (matched.length === cleanKeywords.length) {
            score = 60 + matched.length * 10;
          } else if (matched.length >= 2) {
            score = matched.length * 10;
          }
        }

        if (score > 0) {
          const header = line.slice(0, barIndex).trim().split(' ');
          const wordCount = parseInt(header[3], 16);
          if (!isNaN(wordCount) && wordCount > 0) {
            for (let i = 0; i < wordCount; i++) {
              const rawWord = header[4 + i * 2];
              if (!rawWord) continue;
              const word = rawWord.replace(/_/g, ' ');
              const key = word.toLowerCase();
              if (!seenWords.has(key)) {
                seenWords.add(key);
                hits.push({
                  word,
                  score,
                  partOfSpeech: pos,
                  definition: gloss,
                  source: 'wordnet',
                });
              }
            }
          }
        }

        if (hits.length >= maxResults * 2) break;
      }
    } catch (err) {
      console.error(`Error reading ${f} for reverse search:`, err);
    }

    if (hits.length >= maxResults * 2) break;
  }

  hits.sort((a, b) => (b.score || 0) - (a.score || 0));
  return hits.slice(0, maxResults);
}

/**
 * Main reverse dictionary search entrypoint:
 * Takes a natural language phrase, definition fragment, or concept description (e.g. 'to put forward')
 * and returns ranked words matching that meaning.
 */
export async function searchReverseDefinitions(
  query: string,
  preferences?: ExtensionPreferences,
  limit = 40
): Promise<ReverseSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const cacheKey = trimmed.toLowerCase();
  const cached = memoryCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const isOfflineOnly = preferences?.offlineOnly === true;

  if (isOfflineOnly) {
    const offlineResults = await searchOfflineReverse(trimmed, limit);
    memoryCache.set(cacheKey, offlineResults);
    return offlineResults;
  }

  // Online search with dual-phrase query support (e.g. 'to put forward' and 'put forward')
  const cleanPhrase = trimmed.replace(/^to\s+/i, '').trim();
  const queries = [trimmed];
  if (cleanPhrase && cleanPhrase !== trimmed) {
    queries.push(cleanPhrase);
  }

  try {
    const onlinePromises = queries.map((q) => fetchDatamuse(q, limit));
    const onlineArrays = await Promise.all(onlinePromises);
    const combinedOnline = onlineArrays.flat();

    const dedupedMap = new Map<string, ReverseSearchResult>();
    for (const item of combinedOnline) {
      const lower = item.word.toLowerCase();
      if (!dedupedMap.has(lower)) {
        dedupedMap.set(lower, item);
      } else {
        // Boost score if present in both queries
        const existing = dedupedMap.get(lower)!;
        existing.score = Math.max(existing.score || 0, item.score || 0) + 1000;
        if (!existing.definition && item.definition) {
          existing.definition = item.definition;
        }
      }
    }

    // Also blend curated niche matches if concept keywords match
    const queryTokens = trimmed.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const nicheHits = searchNicheVocabulary(queryTokens);
    const topScore = dedupedMap.size > 0 ? Math.max(...Array.from(dedupedMap.values()).map(x => x.score || 0)) : 50000;
    for (const nh of nicheHits) {
      if (nh.matchScore < 4) continue;
      const lower = nh.word.toLowerCase();
      if (!dedupedMap.has(lower)) {
        dedupedMap.set(lower, {
          word: nh.word,
          score: topScore + Math.round(nh.matchScore * 1000),
          partOfSpeech: nh.partOfSpeech,
          definition: nh.definition,
          source: 'online',
        });
      } else {
        const item = dedupedMap.get(lower)!;
        item.score = (item.score || 0) + Math.round(nh.matchScore * 2000);
        if (!item.definition) item.definition = nh.definition;
      }
    }

    const finalRanked = Array.from(dedupedMap.values()).sort(
      (a, b) => (b.score || 0) - (a.score || 0)
    );

    if (finalRanked.length > 0) {
      const topResults = finalRanked.slice(0, limit);
      memoryCache.set(cacheKey, topResults);
      return topResults;
    }
  } catch (err) {
    console.error('Online reverse search failed, falling back to offline:', err);
  }

  // Fallback to offline WordNet search
  const fallbackResults = await searchOfflineReverse(trimmed, limit);
  memoryCache.set(cacheKey, fallbackResults);
  return fallbackResults;
}
