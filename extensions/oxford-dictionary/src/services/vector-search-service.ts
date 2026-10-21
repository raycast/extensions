import https from 'https';
import fs from 'fs';
import path from 'path';
import {
  VectorSearchResult,
  ExtensionPreferences,
  PartOfSpeech,
} from '../types/dictionary';
import { NICHE_VOCABULARY, searchNicheVocabulary } from '../data/niche-vocabulary';

const vectorMemoryCache = new Map<string, VectorSearchResult[]>();

const STOP_WORDS = new Set([
  'a',
  'about',
  'after',
  'all',
  'also',
  'an',
  'and',
  'any',
  'are',
  'as',
  'at',
  'be',
  'because',
  'been',
  'before',
  'being',
  'between',
  'both',
  'but',
  'by',
  'for',
  'from',
  'further',
  'had',
  'has',
  'have',
  'having',
  'he',
  'her',
  'here',
  'hers',
  'herself',
  'him',
  'himself',
  'his',
  'how',
  'if',
  'in',
  'into',
  'is',
  'it',
  'its',
  'itself',
  'just',
  'me',
  'more',
  'most',
  'my',
  'myself',
  'no',
  'nor',
  'not',
  'now',
  'of',
  'off',
  'on',
  'once',
  'only',
  'or',
  'other',
  'our',
  'ours',
  'ourselves',
  'out',
  'over',
  'own',
  'same',
  'she',
  'should',
  'so',
  'some',
  'such',
  'than',
  'that',
  'the',
  'their',
  'theirs',
  'them',
  'themselves',
  'then',
  'there',
  'these',
  'they',
  'this',
  'those',
  'through',
  'to',
  'too',
  'under',
  'until',
  'up',
  'very',
  'was',
  'we',
  'were',
  'what',
  'when',
  'where',
  'which',
  'while',
  'who',
  'whom',
  'why',
  'with',
  'would',
  'you',
  'your',
  'yours',
  'yourself',
  'yourselves',
]);

const CONCEPT_STEMS: Record<string, string> = {
  dramatic: 'drama',
  theatrical: 'theater',
  literary: 'literature',
  poetic: 'poetry',
  philosophical: 'philosophy',
  psychological: 'psychology',
  tragic: 'tragedy',
  comic: 'comedy',
  heroic: 'hero',
  critical: 'crisis',
  climactic: 'climax',
  narrative: 'story',
  mythic: 'myth',
  mythological: 'myth',
  ironic: 'irony',
};

/**
 * Extracts and normalizes seed words from a raw query string.
 */
export function extractSeedWords(query: string): string[] {
  const rawTokens = query
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/[\s,;]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1);

  const filtered = rawTokens.filter((w) => !STOP_WORDS.has(w));
  const result = filtered.length > 0 ? filtered : rawTokens;
  return Array.from(new Set(result));
}

function parseDatamusePos(tags?: string[]): PartOfSpeech {
  if (!tags || !Array.isArray(tags)) return 'noun';
  if (tags.includes('adj')) return 'adjective';
  if (tags.includes('v')) return 'verb';
  if (tags.includes('n')) return 'noun';
  if (tags.includes('adv')) return 'adverb';
  return 'noun';
}

function parseDatamuseDef(defs?: string[]): { pos?: PartOfSpeech; definition?: string } {
  if (!defs || !Array.isArray(defs) || defs.length === 0) return {};
  const raw = defs[0];
  const parts = raw.split('\t');
  if (parts.length >= 2) {
    const rawPos = parts[0].trim();
    let pos: PartOfSpeech = 'noun';
    if (rawPos === 'adj') pos = 'adjective';
    else if (rawPos === 'v') pos = 'verb';
    else if (rawPos === 'n') pos = 'noun';
    else if (rawPos === 'adv') pos = 'adverb';

    const cleanDef = parts[1].replace(/^[A-Z0-9_]+\s*:\s*/i, '').trim();
    return { pos, definition: cleanDef };
  }
  return { definition: raw.trim() };
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

interface DatamuseRawItem {
  word: string;
  score: number;
  tags?: string[];
  defs?: string[];
}

function fetchDatamuseRaw(queryParam: string, max = 500): Promise<DatamuseRawItem[]> {
  return new Promise((resolve) => {
    const url = `https://api.datamuse.com/words?ml=${encodeURIComponent(queryParam)}&md=dpfs&max=${max}`;
    const req = https.get(url, { timeout: 3500 }, (res) => {
      if (res.statusCode !== 200) {
        resolve([]);
        return;
      }

      let raw = '';
      res.on('data', (chunk) => {
        raw += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(raw);
          if (Array.isArray(json)) {
            resolve(json);
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
 * Advanced multi-vector search:
 * 1. Joint seed query + Canonical stemmed concept query + prominent individual seeds.
 * 2. Reciprocal Rank Fusion (RRF) across parallel queries.
 * 3. Niche Word Elevation: Identifies and promotes rare/literary/scholarly vocabulary (f < 1.0).
 * 4. Definition Concept Overlap Bonus: Boosts words whose definitions explain the user's concepts.
 * 5. Direct integration with the curated Niche Vocabulary bank.
 */
async function fetchDatamuseVector(seeds: string[], limit = 50): Promise<VectorSearchResult[]> {
  const seedSet = new Set(seeds.map((s) => s.toLowerCase()));
  const stemmedSeeds = seeds.map((s) => CONCEPT_STEMS[s] || s);
  const allConceptSeeds = Array.from(new Set([...seeds, ...stemmedSeeds]));

  const promises: Promise<{ source: string; items: DatamuseRawItem[]; weight: number }>[] = [];

  // 1. Joint raw seeds query
  promises.push(
    fetchDatamuseRaw(seeds.join('+'), 600).then((items) => ({
      source: 'joint',
      items,
      weight: 1.0,
    }))
  );

  // 2. Stemmed joint query (if different)
  if (stemmedSeeds.join('+') !== seeds.join('+')) {
    promises.push(
      fetchDatamuseRaw(stemmedSeeds.join('+'), 600).then((items) => ({
        source: 'stemmed',
        items,
        weight: 0.95,
      }))
    );
  }

  // 3. Prominent individual seeds
  for (const seed of seeds.slice(0, 3)) {
    promises.push(
      fetchDatamuseRaw(seed, 500).then((items) => ({
        source: `seed:${seed}`,
        items,
        weight: 0.65,
      }))
    );
  }

  const responses = await Promise.all(promises);

  const aggregated = new Map<
    string,
    {
      word: string;
      rrf: number;
      tags?: string[];
      defs?: string[];
    }
  >();

  for (const resp of responses) {
    const { items, weight } = resp;
    items.forEach((item, rank) => {
      const key = item.word.toLowerCase();
      // Exclude direct seed words from suggestions
      if (seedSet.has(key) || key.length < 3) return;

      const rrfScore = weight * (1.0 / (rank + 25));
      const existing = aggregated.get(key);
      if (existing) {
        existing.rrf += rrfScore;
        if (!existing.defs && item.defs) existing.defs = item.defs;
        if (!existing.tags && item.tags) existing.tags = item.tags;
      } else {
        aggregated.set(key, {
          word: item.word,
          rrf: rrfScore,
          tags: item.tags,
          defs: item.defs,
        });
      }
    });
  }

  // Integrate curated Niche Vocabulary Bank
  for (const entry of NICHE_VOCABULARY) {
    const key = entry.word.toLowerCase();
    if (seedSet.has(key)) continue;

    let conceptHits = 0;
    for (const seed of allConceptSeeds) {
      if (entry.concepts.some((c) => c.toLowerCase() === seed || seed.includes(c) || c.includes(seed))) {
        conceptHits++;
      }
    }

    if (conceptHits > 0) {
      const overlapRatio = conceptHits / Math.max(1, allConceptSeeds.length);
      const nicheRrf = 0.08 * (1.0 + overlapRatio * 1.5);

      const existing = aggregated.get(key);
      if (existing) {
        existing.rrf += nicheRrf;
        if (!existing.defs) existing.defs = [`${entry.partOfSpeech[0]}\t${entry.definition}`];
      } else {
        aggregated.set(key, {
          word: entry.word,
          rrf: nicheRrf,
          defs: [`${entry.partOfSpeech[0]}\t${entry.definition}`],
          tags: [entry.partOfSpeech[0], 'f:0.033'],
        });
      }
    }
  }

  if (aggregated.size === 0) return [];

  // Niche Elevation & Definition Relevance Scoring
  const candidates = Array.from(aggregated.values()).map((cand) => {
    const f = parseFrequency(cand.tags);
    let finalScore = cand.rrf;

    // 1. Niche Elevation:
    // Boost rare, specialized, and literary vocabulary so they are not drowned out by top-frequency words
    if (f < 0.05) finalScore *= 1.85; // Scholarly / ultra-niche gem (e.g. anagnorisis, peripeteia, hamartia)
    else if (f < 0.2) finalScore *= 1.55;
    else if (f < 1.0) finalScore *= 1.3;
    else if (f > 30.0) finalScore *= 0.8; // Common everyday words down-weighted slightly

    // 2. Definition Concept Overlap Bonus:
    if (cand.defs && cand.defs.length > 0) {
      const defText = cand.defs[0].toLowerCase();
      let matchCount = 0;
      for (const s of allConceptSeeds) {
        if (defText.includes(s)) matchCount++;
      }
      if (matchCount > 0) {
        finalScore *= 1.0 + matchCount * 0.4;
      }
    }

    const defInfo = parseDatamuseDef(cand.defs);
    const pos = defInfo.pos || parseDatamusePos(cand.tags);

    return {
      word: cand.word,
      finalScore,
      partOfSpeech: pos,
      definition: defInfo.definition,
    };
  });

  candidates.sort((a, b) => b.finalScore - a.finalScore);

  const topHits = candidates.slice(0, limit);
  const maxScore = topHits.length > 0 ? topHits[0].finalScore : 1;

  return topHits.map((cand, idx) => {
    const ratio = maxScore > 0 ? cand.finalScore / maxScore : 1;
    const rankDecay = Math.max(0, 1 - idx * 0.012);
    const composite = ratio * 0.7 + rankDecay * 0.3;
    const matchPercent = Math.min(99, Math.max(50, Math.round(composite * 99)));
    const similarity = matchPercent / 100;

    return {
      word: cand.word,
      similarity,
      matchPercent,
      score: Math.round(cand.finalScore * 10000),
      partOfSpeech: cand.partOfSpeech,
      definition: cand.definition,
      source: 'online',
    };
  });
}

// ==========================================
// OFFLINE ROGET 1,000-DIMENSIONAL VECTOR SPACE
// ==========================================

let rogetWordToCats: Map<string, Set<number>> | null = null;
let rogetCategoryTitles: Map<number, string> | null = null;

function getRogetJsonPath(): string | null {
  const candidates = [
    path.join(__dirname, '..', '..', 'assets', 'roget-thesaurus.json'),
    path.join(__dirname, '..', 'assets', 'roget-thesaurus.json'),
    path.join(__dirname, 'assets', 'roget-thesaurus.json'),
    'C:/Users/Johno/.config/raycast/extensions/oxford-dictionary/assets/roget-thesaurus.json',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function initRogetVectorIndex(): void {
  if (rogetWordToCats) return;

  const jsonPath = getRogetJsonPath();
  if (!jsonPath) return;

  try {
    const raw = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(raw);
    rogetWordToCats = new Map<string, Set<number>>();
    rogetCategoryTitles = new Map<number, string>();

    for (const entry of data.entries) {
      rogetCategoryTitles.set(entry.id, entry.title);
      const text = entry.body.toLowerCase();
      const tokens = text.match(/\b[a-z]{3,}\b/g) || [];
      for (const t of tokens) {
        if (!rogetWordToCats.has(t)) {
          rogetWordToCats.set(t, new Set<number>());
        }
        rogetWordToCats.get(t)!.add(entry.id);
      }
    }

    // Embed curated Niche Vocabulary into Roget categories
    for (const n of NICHE_VOCABULARY) {
      const w = n.word.toLowerCase();
      if (!rogetWordToCats.has(w)) {
        rogetWordToCats.set(w, new Set<number>());
      }
      for (const catId of n.categories) {
        rogetWordToCats.get(w)!.add(catId);
      }
    }
  } catch (err) {
    console.error('[vector-search] Failed to load Roget index:', err);
  }
}

/**
 * Offline semantic vector search using Roget 1,000-dimensional conceptual vector space
 * enriched with the curated Niche Vocabulary bank.
 */
export function searchOfflineVector(seeds: string[], limit = 40): VectorSearchResult[] {
  initRogetVectorIndex();
  if (!rogetWordToCats || rogetWordToCats.size === 0) return [];

  const queryCats = new Map<number, number>();
  for (const seed of seeds) {
    const cats = rogetWordToCats.get(seed.toLowerCase());
    if (cats) {
      for (const catId of cats) {
        queryCats.set(catId, (queryCats.get(catId) || 0) + 1);
      }
    }
  }

  // Also check concept matches in Niche Vocabulary
  const nicheDirect = searchNicheVocabulary(seeds);

  if (queryCats.size === 0 && nicheDirect.length === 0) return [];

  let queryNormSq = 0;
  for (const count of queryCats.values()) {
    queryNormSq += count * count;
  }
  const queryNorm = Math.max(1, Math.sqrt(queryNormSq));

  const seedSet = new Set(seeds.map((s) => s.toLowerCase()));
  const candidates: {
    word: string;
    sim: number;
    overlapCount: number;
    definition?: string;
    partOfSpeech?: PartOfSpeech;
  }[] = [];

  const seenCandidates = new Set<string>();

  // Check Roget vector category overlaps
  if (queryCats.size > 0) {
    for (const [word, cats] of rogetWordToCats.entries()) {
      if (seedSet.has(word) || word.length < 3) continue;

      let dot = 0;
      let overlapCount = 0;
      for (const catId of cats) {
        const qWeight = queryCats.get(catId);
        if (qWeight !== undefined) {
          dot += qWeight;
          overlapCount++;
        }
      }

      if (dot > 0) {
        const docNorm = Math.sqrt(cats.size);
        const cosine = dot / (docNorm * queryNorm);
        seenCandidates.add(word);

        // Check if this candidate is in Niche Vocabulary
        const nicheMatch = NICHE_VOCABULARY.find((n) => n.word.toLowerCase() === word);
        const simBoost = nicheMatch ? cosine * 1.4 : cosine;

        candidates.push({
          word,
          sim: simBoost,
          overlapCount,
          definition: nicheMatch
            ? nicheMatch.definition
            : `Associated with ${overlapCount} related concept ${overlapCount === 1 ? 'category' : 'categories'}`,
          partOfSpeech: nicheMatch?.partOfSpeech,
        });
      }
    }
  }

  // Add any direct niche concept hits not already found
  for (const n of nicheDirect) {
    const w = n.word.toLowerCase();
    if (seedSet.has(w) || seenCandidates.has(w)) continue;
    seenCandidates.add(w);
    candidates.push({
      word: n.word,
      sim: 0.95,
      overlapCount: n.categories.length,
      definition: n.definition,
      partOfSpeech: n.partOfSpeech,
    });
  }

  candidates.sort((a, b) => b.sim - a.sim || b.overlapCount - a.overlapCount);

  const topHits = candidates.slice(0, limit);
  const maxSim = topHits.length > 0 ? topHits[0].sim : 1;

  return topHits.map((hit, idx) => {
    const ratio = maxSim > 0 ? hit.sim / maxSim : 1;
    const rankDecay = Math.max(0, 1 - idx * 0.015);
    const score = ratio * 0.75 + rankDecay * 0.25;
    const matchPercent = Math.min(98, Math.max(50, Math.round(score * 98)));

    return {
      word: hit.word,
      similarity: matchPercent / 100,
      matchPercent,
      score: Math.round(hit.sim * 1000),
      source: 'offline',
      partOfSpeech: hit.partOfSpeech,
      definition: hit.definition,
    };
  });
}

/**
 * Main vector search entrypoint:
 * Takes multiple seed words, projects them into embedding space,
 * and returns ranked results by semantic proximity/cosine similarity.
 */
export async function searchVectorSynonyms(
  query: string,
  preferences?: ExtensionPreferences,
  limit = 50
): Promise<VectorSearchResult[]> {
  const seeds = extractSeedWords(query);
  if (seeds.length === 0) return [];

  const cacheKey = seeds.sort().join('+');
  if (vectorMemoryCache.has(cacheKey)) {
    return vectorMemoryCache.get(cacheKey)!;
  }

  const isOfflineOnly = !!preferences?.offlineOnly;

  if (isOfflineOnly) {
    const offlineHits = searchOfflineVector(seeds, limit);
    vectorMemoryCache.set(cacheKey, offlineHits);
    return offlineHits;
  }

  try {
    const onlineHits = await fetchDatamuseVector(seeds, limit);
    if (onlineHits.length > 0) {
      vectorMemoryCache.set(cacheKey, onlineHits);
      return onlineHits;
    }
  } catch {
    // Fall back to offline vector search
  }

  const fallbackHits = searchOfflineVector(seeds, limit);
  vectorMemoryCache.set(cacheKey, fallbackHits);
  return fallbackHits;
}
