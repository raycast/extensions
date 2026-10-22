import https from 'https';
import fs from 'fs';
import path from 'path';
import {
  VectorSearchResult,
  ExtensionPreferences,
  PartOfSpeech,
} from '../types/dictionary';
import { NICHE_VOCABULARY, searchNicheVocabulary } from '../data/niche-vocabulary';
import { lookupOffline } from './offline-dictionary';

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
  // CLASS I: Abstract Relations (Quantity, Time, Change, Causation)
  ancient: 'antiquity',
  primordial: 'origin',
  eternal: 'eternity',
  ephemeral: 'transience',
  temporal: 'time',
  transitional: 'transition',
  causal: 'cause',
  infinite: 'infinity',
  mutable: 'change',

  // CLASS II: Space, Scale, Dimensions & Form
  structural: 'structure',
  architectural: 'architecture',
  spatial: 'space',
  monumental: 'monument',
  geometric: 'geometry',
  symmetrical: 'symmetry',
  circular: 'circle',
  linear: 'line',
  cavernous: 'cavern',
  labyrinthine: 'labyrinth',
  subterranean: 'underground',
  colossal: 'colossus',
  titanic: 'titan',
  gigantic: 'giant',
  microscopic: 'microscope',
  diminutive: 'diminution',
  imposing: 'majesty',
  lofty: 'height',
  abyssal: 'abyss',
  radial: 'radius',

  // CLASS III: Matter & Sensory Perception (Light, Sound, Odor, Senses)
  luminous: 'light',
  tenebrous: 'darkness',
  sonorous: 'sound',
  susurrant: 'whisper',
  fragrant: 'perfume',
  pungent: 'odor',
  nocturnal: 'night',
  crepuscular: 'twilight',
  diurnal: 'day',
  thermal: 'heat',
  frigid: 'cold',
  fluid: 'liquid',
  aerial: 'air',
  aquatic: 'water',

  // CLASS IV: Intellect, Knowledge & Language
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
  logical: 'logic',
  epistemic: 'knowledge',
  epistemological: 'epistemology',
  metaphysical: 'metaphysics',
  symbolic: 'symbol',
  rhetorical: 'rhetoric',
  metaphorical: 'metaphor',
  allegorical: 'allegory',
  paradoxical: 'paradox',
  didactic: 'instruction',
  pedantic: 'pedantry',
  arcane: 'mystery',
  recondite: 'obscurity',
  esoteric: 'secrecy',
  apocryphal: 'fiction',
  veracious: 'truth',

  // CLASS V: Volition, Action, Mastery & Authority
  strategic: 'strategy',
  tactical: 'tactic',
  resolute: 'determination',
  sovereign: 'authority',
  tyrannical: 'tyranny',
  martial: 'warfare',
  opulent: 'wealth',
  destitute: 'poverty',
  dexterous: 'skill',

  // CLASS VI: Sentient, Psychological, Moral & Spiritual Powers
  aesthetic: 'beauty',
  melancholic: 'melancholy',
  wistful: 'longing',
  nostalgic: 'nostalgia',
  ecstatic: 'ecstasy',
  somber: 'gloom',
  chivalric: 'chivalry',
  chivalrous: 'honor',
  righteous: 'virtue',
  ignominious: 'disgrace',
  sacred: 'sanctity',
  profane: 'impiety',
  seraphic: 'angel',
  daemonic: 'demon',
  elysian: 'paradise',
  cathartic: 'catharsis',
  hubristic: 'hubris',
  nemetic: 'nemesis',
  apocalyptic: 'apocalypse',
  threnodic: 'threnody',
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

// Systematic English morphological adjective derivations from nouns across Roget conceptual dimensions
const CLASSICAL_ADJECTIVES: Record<string, string> = {
  // Class II: Space, Architecture, Form & Scale
  edifice: 'edificial',
  palace: 'palatial',
  colossus: 'colossal',
  cyclops: 'cyclopean',
  titan: 'titanic',
  labyrinth: 'labyrinthine',
  monolith: 'monolithic',
  statue: 'statuesque',
  cathedral: 'cathedralic',
  pyramid: 'pyramidal',
  citadel: 'citadelic',
  basilica: 'basilican',
  acropolis: 'acropolitan',
  cavern: 'cavernous',
  abyss: 'abyssal',
  chasm: 'chasmic',
  gargoyle: 'gargoylish',

  // Class I & III: Time, Matter, Cosmos & Nature
  epoch: 'epochal',
  tempest: 'tempestuous',
  meteor: 'meteoric',
  aurora: 'auroral',
  zenith: 'zenithal',
  volcano: 'volcanic',
  ether: 'ethereal',
  aether: 'ethereal',
  ocean: 'oceanic',
  glacier: 'glacial',

  // Class IV: Intellect, Ideas, Rhetoric & Myth
  epiphany: 'epiphanic',
  aporia: 'aporetic',
  allegory: 'allegorical',
  metaphor: 'metaphorical',
  paradox: 'paradoxical',
  didact: 'didactic',
  pedant: 'pedantic',
  polemic: 'polemical',
  chiasmus: 'chiastic',
  litotes: 'litotic',
  chimera: 'chimerical',
  oracle: 'oracular',

  // Class VI: Sentient, Moral, Psychological & Spiritual
  hubris: 'hubristic',
  catharsis: 'cathartic',
  nemesis: 'nemetic',
  threnody: 'threnodic',
  nostalgia: 'nostalgic',
  melancholy: 'melancholic',
  seraph: 'seraphic',
  elysium: 'elysian',
  apocalypse: 'apocalyptic',
  specter: 'spectral',
  phantom: 'phantasmal',
};

function getAdjectiveDerivations(noun: string): string[] {
  const w = noun.toLowerCase();
  const candidates: string[] = [];
  if (CLASSICAL_ADJECTIVES[w]) {
    candidates.push(CLASSICAL_ADJECTIVES[w]);
  }
  if (w.endsWith('ice')) {
    candidates.push(w.slice(0, -3) + 'icial');
  }
  if (w.endsWith('e')) {
    candidates.push(w.slice(0, -1) + 'al');
    candidates.push(w.slice(0, -1) + 'esque');
    candidates.push(w.slice(0, -1) + 'ic');
  }
  if (w.endsWith('ment')) {
    candidates.push(w + 'al');
  }
  if (w.endsWith('y')) {
    candidates.push(w.slice(0, -1) + 'ic');
    candidates.push(w.slice(0, -1) + 'ical');
    candidates.push(w.slice(0, -1) + 'ious');
  }
  if (w.endsWith('ism')) {
    candidates.push(w.slice(0, -3) + 'ic');
    candidates.push(w.slice(0, -3) + 'ical');
  }
  if (w.endsWith('sis') || w.endsWith('xis')) {
    candidates.push(w.slice(0, -3) + 'tic');
  }
  return Array.from(new Set(candidates));
}

/**
 * Advanced multi-vector search:
 * 1. Joint seed query + Canonical stemmed concept query + prominent individual seeds.
 * 2. Multi-Dimensional Synergy & Cross-Seed Convergence across parallel query dimensions.
 * 3. Morphological Part-of-Speech Alignment (derives valid adjective forms when query is descriptive).
 * 4. Gentle Niche Word Elevation & Definition Concept Overlap.
 * 5. Direct integration with the curated Niche Vocabulary bank.
 */
async function fetchDatamuseVector(seeds: string[], limit = 50): Promise<VectorSearchResult[]> {
  const seedSet = new Set(seeds.map((s) => s.toLowerCase()));
  const stemmedSeeds = seeds.map((s) => CONCEPT_STEMS[s] || s);
  const allConceptSeeds = Array.from(new Set([...seeds, ...stemmedSeeds]));

  // Check if query is predominantly adjectival
  let seedAdjCount = 0;
  for (const s of seeds) {
    const off = await lookupOffline(s);
    if (off && off.meanings.some((m) => m.partOfSpeech === 'adjective')) {
      seedAdjCount++;
    }
  }
  const isPredominantlyAdjective = seedAdjCount >= Math.ceil(seeds.length / 2);

  const promises: Promise<{ source: string; items: DatamuseRawItem[]; weight: number }>[] = [];

  // 1. Joint raw seeds query (multi-dimensional conjunction gets primary weight)
  promises.push(
    fetchDatamuseRaw(seeds.join('+'), 600).then((items) => ({
      source: 'joint',
      items,
      weight: 1.8,
    }))
  );

  // 2. Stemmed joint query (if different)
  if (stemmedSeeds.join('+') !== seeds.join('+')) {
    promises.push(
      fetchDatamuseRaw(stemmedSeeds.join('+'), 600).then((items) => ({
        source: 'stemmed',
        items,
        weight: 1.5,
      }))
    );
  }

  // 3. Prominent individual seeds (auxiliary single dimensions)
  for (const seed of seeds.slice(0, 3)) {
    promises.push(
      fetchDatamuseRaw(seed, 400).then((items) => ({
        source: `seed:${seed}`,
        items,
        weight: 0.30,
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
      jointRank?: number;
      seedDimensions: Set<string>;
    }
  >();

  for (const resp of responses) {
    const { items, weight, source } = resp;
    items.forEach((item, rank) => {
      const key = item.word.toLowerCase();
      // Exclude direct seed words from suggestions
      if (seedSet.has(key) || key.length < 3) return;

      const rrfScore = weight * (1.0 / (rank + 25));
      const existing = aggregated.get(key);
      if (existing) {
        existing.rrf += rrfScore;
        existing.seedDimensions.add(source);
        if (source === 'joint' && existing.jointRank === undefined) {
          existing.jointRank = rank;
        }
        if (!existing.defs && item.defs) existing.defs = item.defs;
        if (!existing.tags && item.tags) existing.tags = item.tags;
      } else {
        aggregated.set(key, {
          word: item.word,
          rrf: rrfScore,
          tags: item.tags,
          defs: item.defs,
          jointRank: source === 'joint' ? rank : undefined,
          seedDimensions: new Set([source]),
        });
      }
    });
  }

  // Morphological Derivation Expansion:
  // If query is predominantly adjectival and top nouns exist, derive valid adjectives!
  if (isPredominantlyAdjective) {
    const topNouns = Array.from(aggregated.values())
      .filter((c) => parseDatamusePos(c.tags) === 'noun')
      .sort((a, b) => b.rrf - a.rrf)
      .slice(0, 10);

    for (const nounCand of topNouns) {
      const adjDerivs = getAdjectiveDerivations(nounCand.word);
      for (const adjWord of adjDerivs) {
        if (aggregated.has(adjWord) || seedSet.has(adjWord)) continue;
        const dictInfo = await lookupOffline(adjWord);
        if (dictInfo) {
          const adjMeaning = dictInfo.meanings.find((m) => m.partOfSpeech === 'adjective');
          if (adjMeaning && adjMeaning.definitions.length > 0) {
            const adjDef = adjMeaning.definitions[0] || `Pertaining to ${nounCand.word}; structural.`;
            const adjRrf = nounCand.rrf * 1.15;
            aggregated.set(adjWord, {
              word: adjWord,
              rrf: adjRrf,
              tags: ['adj', 'f:0.04'],
              defs: [`adj\t${adjDef}`],
              jointRank: nounCand.jointRank,
              seedDimensions: new Set(nounCand.seedDimensions),
            });
          }
        }
      }
    }
  }

  // Integrate curated Niche Vocabulary Bank ONLY for high-confidence concept matches
  const nicheMatches = searchNicheVocabulary(allConceptSeeds);
  for (const n of nicheMatches) {
    const key = n.word.toLowerCase();
    if (seedSet.has(key)) continue;

    // Only inject if there is a strong match (matchScore >= 8.0)
    if (n.matchScore >= 8.0) {
      const nicheRrf = Math.min(0.045, 0.020 + (n.matchScore / 30) * 0.025);

      const existing = aggregated.get(key);
      if (existing) {
        existing.rrf += nicheRrf;
        if (!existing.defs) existing.defs = [`${n.partOfSpeech[0]}\t${n.definition}`];
      } else {
        aggregated.set(key, {
          word: n.word,
          rrf: nicheRrf,
          defs: [`${n.partOfSpeech[0]}\t${n.definition}`],
          tags: [n.partOfSpeech[0], 'f:0.033'],
          seedDimensions: new Set(['joint']),
        });
      }
    }
  }

  if (aggregated.size === 0) return [];

  // Multi-Dimensional Synergy & Frequency Calibration Scoring
  const candidates = Array.from(aggregated.values()).map((cand) => {
    const f = parseFrequency(cand.tags);
    let finalScore = cand.rrf;

    // 1. Joint winner bonus:
    if (cand.jointRank !== undefined && cand.jointRank <= 3) {
      finalScore *= 1.35 - cand.jointRank * 0.08;
    }

    // 2. Definition Dimension Overlap:
    let defSeedHits = 0;
    if (cand.defs && cand.defs.length > 0) {
      const defText = cand.defs[0].toLowerCase();
      for (const s of allConceptSeeds) {
        if (s.length >= 4 && defText.includes(s)) defSeedHits++;
      }
    }

    // 3. Multi-Dimensional Synergy:
    // Rewards words that satisfy 2 or more distinct dimensions of the user's query
    const totalDimensionsCovered = Math.min(
      seeds.length,
      (cand.seedDimensions.size - (cand.seedDimensions.has('joint') ? 1 : 0)) + defSeedHits
    );
    if (totalDimensionsCovered >= 2) {
      finalScore *= 1.0 + totalDimensionsCovered * 0.15;
    }

    // 4. Frequency calibration
    if (f < 0.05) finalScore *= 1.15;
    else if (f < 0.2) finalScore *= 1.10;
    else if (f < 1.0) finalScore *= 1.05;
    else if (f > 40.0) finalScore *= 0.90;

    const defInfo = parseDatamuseDef(cand.defs);
    const pos = defInfo.pos || parseDatamusePos(cand.tags);

    // 5. Query Part-of-Speech Alignment:
    if (isPredominantlyAdjective && pos === 'adjective') {
      finalScore *= 1.10;
    }

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

function getRogetClassId(categoryId: number): number {
  if (categoryId <= 179) return 1; // Class I: Abstract Relations
  if (categoryId <= 315) return 2; // Class II: Space & Dimensions
  if (categoryId <= 449) return 3; // Class III: Matter & Sensory
  if (categoryId <= 599) return 4; // Class IV: Intellect & Language
  if (categoryId <= 819) return 5; // Class V: Volition & Authority
  return 6;                       // Class VI: Sentient & Moral
}

/**
 * Offline semantic vector search using Roget 1,000-dimensional conceptual vector space
 * enriched with the curated Niche Vocabulary bank and multi-class macro-dimensional convergence.
 */
export function searchOfflineVector(seeds: string[], limit = 40): VectorSearchResult[] {
  initRogetVectorIndex();
  if (!rogetWordToCats || rogetWordToCats.size === 0) return [];

  const queryCats = new Map<number, number>();
  const queryClasses = new Set<number>();
  for (const seed of seeds) {
    const cats = rogetWordToCats.get(seed.toLowerCase());
    if (cats) {
      for (const catId of cats) {
        queryCats.set(catId, (queryCats.get(catId) || 0) + 1);
        queryClasses.add(getRogetClassId(catId));
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

        // Multi-dimensional synergy in Roget space:
        // 1. Specific category overlap count
        const dimCoverage = Math.min(seeds.length, overlapCount);
        const dimBonus = dimCoverage >= 2 ? 1.0 + dimCoverage * 0.12 : 1.0;

        // 2. Macro-Dimension (Roget Class) convergence:
        // Calculates how many of the query's distinct Roget Classes (Space, Matter, Intellect, Moral, etc.)
        // this candidate touches
        const matchedClasses = new Set<number>();
        for (const catId of cats) {
          if (queryCats.has(catId)) {
            matchedClasses.add(getRogetClassId(catId));
          }
        }
        const macroBonus = matchedClasses.size >= 2 ? 1.0 + (matchedClasses.size - 1) * 0.10 : 1.0;

        const finalCosine = cosine * dimBonus * macroBonus;

        // Check if this candidate is in Niche Vocabulary
        const nicheMatch = NICHE_VOCABULARY.find((n) => n.word.toLowerCase() === word);
        const simBoost = nicheMatch ? finalCosine * 1.06 : finalCosine;

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

  // Add direct niche concept hits ONLY if they had a strong match
  for (const n of nicheDirect) {
    const w = n.word.toLowerCase();
    if (seedSet.has(w) || seenCandidates.has(w)) continue;
    // Require a significant match score (>= 8.0) so partial or spurious hits never get added
    if (n.matchScore < 8.0) continue;

    seenCandidates.add(w);
    // Calibrated similarity (capped at 0.85 so it shows in top results when specifically searched)
    const calibratedSim = Math.min(0.85, 0.50 + (n.matchScore / 25) * 0.35);

    candidates.push({
      word: n.word,
      sim: calibratedSim,
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
