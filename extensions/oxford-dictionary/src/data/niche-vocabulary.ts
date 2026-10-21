import { PartOfSpeech } from '../types/dictionary';

export interface NicheWordEntry {
  word: string;
  partOfSpeech: PartOfSpeech;
  definition: string;
  concepts: string[];
  categories: number[]; // Roget category IDs (1-1000)
  example?: string;
}

export const NICHE_VOCABULARY: NicheWordEntry[] = [
  // --- DRAMA & LITERARY CRITICISM ---
  {
    word: 'anagnorisis',
    partOfSpeech: 'noun',
    definition: 'The moment in a drama or narrative when a character makes a critical discovery, startlingly revealing previously hidden truth or identity.',
    concepts: [
      'discovery', 'recognition', 'revelation', 'realization', 'drama', 'dramatic',
      'plot', 'hero', 'identity', 'truth', 'moment', 'critical', 'turning point',
      'denouement', 'tragedy', 'epiphany', 'unveiling', 'reversal', 'climax'
    ],
    categories: [484, 522, 599], // Discovery, Interpretation/Denouement, The Drama
    example: 'In Sophocles\' Oedipus Rex, the terrible anagnorisis occurs when Oedipus discovers he killed his father.',
  },
  {
    word: 'peripeteia',
    partOfSpeech: 'noun',
    definition: 'A sudden reversal of fortune or change in circumstances, especially in a dramatic or narrative work.',
    concepts: [
      'reversal', 'fortune', 'circumstances', 'turning point', 'drama', 'dramatic',
      'plot', 'twist', 'change', 'downfall', 'tragedy', 'climax', 'sudden'
    ],
    categories: [146, 599], // Reversal, The Drama
    example: 'The play\'s peripeteia turns the triumphant protagonist into a penniless fugitive.',
  },
  {
    word: 'hamartia',
    partOfSpeech: 'noun',
    definition: 'A fatal flaw or tragic error in judgment leading to the downfall of a hero.',
    concepts: [
      'flaw', 'fatal flaw', 'tragic flaw', 'error', 'downfall', 'tragedy', 'hero',
      'judgment', 'weakness', 'drama', 'moral', 'character'
    ],
    categories: [495, 599, 945], // Error, The Drama, Guilt
    example: 'His unchecked hubris was the classic hamartia that brought ruin upon his house.',
  },
  {
    word: 'catharsis',
    partOfSpeech: 'noun',
    definition: 'The process of releasing and thereby providing relief from strong, repressed, or pent-up emotions through art or drama.',
    concepts: [
      'relief', 'release', 'cleansing', 'purge', 'purification', 'emotion', 'emotional',
      'drama', 'tragedy', 'healing', 'pity', 'fear'
    ],
    categories: [652, 824, 599], // Cleansing, Relief, The Drama
    example: 'Watching the tragic ending provided the audience with an overwhelming sense of catharsis.',
  },
  {
    word: 'eucatastrophe',
    partOfSpeech: 'noun',
    definition: 'A sudden, unexpected turn of events at the climax of a story that saves the protagonist from impending doom.',
    concepts: [
      'happy ending', 'turnaround', 'miraculous', 'salvation', 'deliverance', 'joy',
      'unexpected', 'resolution', 'denouement', 'fairy tale', 'climax', 'reversal'
    ],
    categories: [522, 618, 827], // Solution, Good, Joy
    example: 'Tolkien coined eucatastrophe to describe the sudden joy of miraculous grace at the narrative brink of despair.',
  },
  {
    word: 'defamiliarization',
    partOfSpeech: 'noun',
    definition: 'The artistic technique of presenting common things in an unfamiliar or strange way to enhance perception.',
    concepts: [
      'strange', 'unfamiliar', 'artistic', 'perception', 'technique', 'novelty',
      'estrangement', 'perspective', 'viewpoint', 'literature', 'fresh'
    ],
    categories: [83, 569, 599], // Novelty, Figure of Speech, The Drama
    example: 'Through defamiliarization, the poet makes an ordinary chair appear as a mysterious sculptural form.',
  },
  {
    word: 'bathos',
    partOfSpeech: 'noun',
    definition: 'An effect of anticlimax created by an unintentional lapse in mood from the sublime to the trivial or ridiculous.',
    concepts: [
      'anticlimax', 'sublime', 'ridiculous', 'disappointment', 'mood', 'literature',
      'descent', 'comedy', 'lapse', 'trivial'
    ],
    categories: [569, 856], // Figure of Speech, Ridiculousness
    example: 'The solemn funeral eulogy plunged into pure bathos when the speaker complained about the parking fees.',
  },
  {
    word: 'denouement',
    partOfSpeech: 'noun',
    definition: 'The final part of a play, film, or narrative in which the strands of the plot are drawn together and matters are resolved.',
    concepts: [
      'resolution', 'ending', 'plot', 'unraveling', 'conclusion', 'drama',
      'story', 'climax', 'finale', 'aftermath'
    ],
    categories: [67, 522, 599], // End, Interpretation, The Drama
  },
  {
    word: 'hubris',
    partOfSpeech: 'noun',
    definition: 'Excessive pride, presumption, or arrogance toward the gods or moral limits that invites retribution.',
    concepts: [
      'pride', 'arrogance', 'insolence', 'downfall', 'tragedy', 'overconfidence',
      'fatal', 'greek tragedy', 'presumption'
    ],
    categories: [880, 599], // Vanity/Pride, The Drama
  },
  {
    word: 'bildungsroman',
    partOfSpeech: 'noun',
    definition: 'A novel dealing with one person\'s formative years, spiritual education, or psychological development (coming of age).',
    concepts: [
      'coming of age', 'novel', 'growth', 'education', 'development', 'youth',
      'maturation', 'life journey', 'formative'
    ],
    categories: [537, 594], // Teaching, Description/Literature
  },
  {
    word: 'verisimilitude',
    partOfSpeech: 'noun',
    definition: 'The appearance or semblance of being true, authentic, or real in art and literature.',
    concepts: [
      'realism', 'authenticity', 'truth', 'appearance', 'plausibility',
      'believable', 'lifelike', 'literature', 'fiction'
    ],
    categories: [494, 543], // Truth, Veracity
  },
  {
    word: 'deus ex machina',
    partOfSpeech: 'noun',
    definition: 'An unexpected power, event, or contrived device that artificially resolves a seemingly hopeless situation.',
    concepts: [
      'artificial resolution', 'contrived', 'plot device', 'miraculous',
      'drama', 'narrative', 'convenient', 'intervention'
    ],
    categories: [599, 704], // The Drama, Facility
  },

  // --- RHETORIC & LINGUISTICS ---
  {
    word: 'aporia',
    partOfSpeech: 'noun',
    definition: 'An irresolvable internal contradiction or logical impasse in a text, argument, or philosophical theory.',
    concepts: [
      'impasse', 'puzzle', 'contradiction', 'paradox', 'doubt', 'dilemma',
      'philosophy', 'logic', 'irresolvable', 'confusion', 'perplexity'
    ],
    categories: [475, 514], // Doubt, Difficulty
  },
  {
    word: 'chiasmus',
    partOfSpeech: 'noun',
    definition: 'A rhetorical figure in which words, grammatical constructions, or concepts are repeated in reverse order.',
    concepts: [
      'rhetoric', 'figure of speech', 'reversal', 'symmetry', 'cross', 'grammar',
      'device', 'parallel', 'inverted', 'criss-cross'
    ],
    categories: [569, 573], // Figure of Speech, Style
  },
  {
    word: 'synecdoche',
    partOfSpeech: 'noun',
    definition: 'A figure of speech in which a part is made to represent the whole, or vice versa (e.g. "suits" for businesspeople).',
    concepts: [
      'figure of speech', 'part for whole', 'representation', 'rhetoric', 'metaphor',
      'language', 'symbol'
    ],
    categories: [569], // Figure of Speech
  },
  {
    word: 'metonymy',
    partOfSpeech: 'noun',
    definition: 'The substitution of the name of an attribute or adjunct for that of the thing meant (e.g. "the crown" for the monarchy).',
    concepts: [
      'figure of speech', 'substitution', 'symbol', 'attribute', 'rhetoric',
      'metaphor', 'association'
    ],
    categories: [569],
  },
  {
    word: 'sesquipedalian',
    partOfSpeech: 'adjective',
    definition: 'Given to or characterized by the use of long, multisyllabic, and complex words.',
    concepts: [
      'long words', 'polysyllabic', 'verbose', 'complex', 'grandiloquent',
      'vocabulary', 'pedantic', 'language', 'erudite'
    ],
    categories: [573], // Verbosity
  },
  {
    word: 'portmanteau',
    partOfSpeech: 'noun',
    definition: 'A word blending the sounds and meanings of two distinct words (e.g. "brunch" from breakfast and lunch).',
    concepts: [
      'blend', 'compound word', 'linguistics', 'neologism', 'hybrid word', 'combination'
    ],
    categories: [562], // Word
  },
  {
    word: 'litotes',
    partOfSpeech: 'noun',
    definition: 'An ironic understatement in which an affirmative is expressed by the negative of its contrary (e.g. "not bad" for good).',
    concepts: [
      'understatement', 'double negative', 'irony', 'rhetoric', 'figure of speech', 'restraint'
    ],
    categories: [569],
  },

  // --- PSYCHOLOGY, EMOTIONS & HUMAN EXPERIENCE ---
  {
    word: 'schadenfreude',
    partOfSpeech: 'noun',
    definition: 'Pleasure or satisfaction derived by someone from another person\'s misfortune or bad luck.',
    concepts: [
      'pleasure', 'misfortune', 'malice', 'harm', 'malicious', 'joy',
      'failure', 'rivalry', 'satisfaction', 'gloating'
    ],
    categories: [827, 907], // Pleasure, Malice
  },
  {
    word: 'saudade',
    partOfSpeech: 'noun',
    definition: 'A deep, melancholic longing or nostalgia for someone or something that is absent or irrevocably lost.',
    concepts: [
      'longing', 'nostalgia', 'yearning', 'melancholy', 'absence', 'loss',
      'missing', 'wistful', 'sorrow', 'homesickness'
    ],
    categories: [833, 837], // Longing, Dejection
  },
  {
    word: 'alexithymia',
    partOfSpeech: 'noun',
    definition: 'The subclinical inability to identify, recognize, and verbally describe one\'s own emotions.',
    concepts: [
      'emotions', 'emotional blindness', 'unfeeling', 'feelings', 'psychology',
      'inability', 'identify', 'numb', 'describe', 'mute'
    ],
    categories: [823], // Insensibility
  },
  {
    word: 'weltschmerz',
    partOfSpeech: 'noun',
    definition: 'A feeling of melancholy and world-weariness caused by comparison of the actual state of the world with an ideal state.',
    concepts: [
      'world-weariness', 'melancholy', 'pessimism', 'disillusionment', 'sorrow',
      'idealism', 'depression', 'angst'
    ],
    categories: [837, 853], // Dejection, Discontent
  },
  {
    word: 'ennui',
    partOfSpeech: 'noun',
    definition: 'A feeling of listlessness, boredom, and dissatisfaction arising from a lack of occupation or excitement.',
    concepts: [
      'boredom', 'listlessness', 'tedium', 'weariness', 'dissatisfaction',
      'apathy', 'stagnation', 'lethargy'
    ],
    categories: [841], // Weariness
  },
  {
    word: 'sprezzatura',
    partOfSpeech: 'noun',
    definition: 'Studied carelessness; the art of performing a difficult action so as to make it seem effortless and natural.',
    concepts: [
      'effortless', 'grace', 'carelessness', 'nonchalance', 'easy', 'elegance',
      'skill', 'mastery', 'courtier', 'natural', 'poise'
    ],
    categories: [698, 700], // Skill, Conduct
  },
  {
    word: 'quixotic',
    partOfSpeech: 'adjective',
    definition: 'Exceedingly idealistic, unrealistic, impractical, and chivalrous in pursuit of noble ideals.',
    concepts: [
      'idealistic', 'unrealistic', 'impractical', 'chivalrous', 'romantic',
      'visionary', 'naive', 'noble', 'don quixote'
    ],
    categories: [515, 861], // Imagination, Courage
  },
  {
    word: 'apophenia',
    partOfSpeech: 'noun',
    definition: 'The tendency to perceive meaningful patterns or connections between unrelated or random things.',
    concepts: [
      'pattern', 'connection', 'random', 'illusion', 'psychology', 'perception',
      'meaningful', 'conspiracy', 'coincidence'
    ],
    categories: [515, 495], // Imagination, Error
  },
  {
    word: 'sonder',
    partOfSpeech: 'noun',
    definition: 'The profound realization that each random passerby is living a life as vivid, intricate, and complex as your own.',
    concepts: [
      'realization', 'empathy', 'strangers', 'life', 'complex', 'perspective',
      'humanity', 'solipsism', 'awareness', 'existential'
    ],
    categories: [498, 888], // Judgment, Sympathy
  },

  // --- NATURE, SENSORY & SCIENCE ---
  {
    word: 'petrichor',
    partOfSpeech: 'noun',
    definition: 'A pleasant, distinctive smell that frequently accompanies the first rain after a long period of warm, dry weather.',
    concepts: [
      'rain', 'smell', 'scent', 'odor', 'earth', 'ground', 'weather', 'dry',
      'rainfall', 'soil', 'atmosphere', 'ozone'
    ],
    categories: [398], // Odor / Fragrance
  },
  {
    word: 'syzygy',
    partOfSpeech: 'noun',
    definition: 'A straight-line configuration of three or more celestial bodies in a gravitational system (such as Sun, Earth, and Moon during an eclipse).',
    concepts: [
      'alignment', 'celestial', 'astronomy', 'planets', 'eclipse', 'sun', 'moon',
      'line', 'straight', 'gravity', 'conjunction'
    ],
    categories: [70, 318], // Conjunction, Astronomy
  },
  {
    word: 'crepuscular',
    partOfSpeech: 'adjective',
    definition: 'Resembling or relating to twilight; active primarily during the twilight hours of dawn and dusk.',
    concepts: [
      'twilight', 'dusk', 'dawn', 'evening', 'dim', 'shadowy', 'nocturnal',
      'animals', 'sunset', 'gloaming'
    ],
    categories: [422], // Dimness
  },
  {
    word: 'susurrus',
    partOfSpeech: 'noun',
    definition: 'A soft, whispering, murmuring, or rustling sound like wind through leaves or gentle waves.',
    concepts: [
      'whisper', 'murmur', 'rustle', 'sound', 'wind', 'leaves', 'soft',
      'gentle', 'hiss', 'hum'
    ],
    categories: [405], // Faint Sound
  },
  {
    word: 'liminality',
    partOfSpeech: 'noun',
    definition: 'The quality of ambiguity or disorientation that occurs in the middle stage of a transition, threshold, or passage.',
    concepts: [
      'threshold', 'transition', 'in-between', 'boundary', 'passage',
      'intermediate', 'ambiguity', 'space'
    ],
    categories: [227, 232], // Limit, Middle
  },
  {
    word: 'palimpsest',
    partOfSpeech: 'noun',
    definition: 'A manuscript or surface on which the original writing has been effaced to make room for later writing, but of which traces remain.',
    concepts: [
      'manuscript', 'erased', 'layers', 'traces', 'history', 'reused',
      'overwritten', 'document', 'memory'
    ],
    categories: [552, 590], // Erasure, Writing
  },
  {
    word: 'ouroboros',
    partOfSpeech: 'noun',
    definition: 'An ancient circular symbol depicting a serpent or dragon eating its own tail, symbolizing eternity, cycles, and renewal.',
    concepts: [
      'serpent', 'snake', 'dragon', 'eternity', 'cycle', 'circular', 'rebirth',
      'renewal', 'infinity', 'symbol'
    ],
    categories: [247, 112], // Circularity, Perpetuity
  },
  {
    word: 'callipygian',
    partOfSpeech: 'adjective',
    definition: 'Having well-shaped, beautiful buttocks.',
    concepts: [
      'shapely', 'buttocks', 'beauty', 'aesthetic', 'figure', 'body', 'comely'
    ],
    categories: [845], // Beauty
  },
  {
    word: 'serendipity',
    partOfSpeech: 'noun',
    definition: 'The occurrence and development of events by chance in a happy, fortunate, or beneficial way.',
    concepts: [
      'chance', 'luck', 'happy accident', 'fortune', 'unexpected', 'coincidence',
      'discovery', 'providence', 'fortunate'
    ],
    categories: [156, 734], // Chance, Prosperity
  },
  {
    word: 'ineffable',
    partOfSpeech: 'adjective',
    definition: 'Too great, sacred, or extreme to be expressed or described in words.',
    concepts: [
      'indescribable', 'unspeakable', 'transcendent', 'sublime', 'beyond words',
      'sacred', 'overwhelming'
    ],
    categories: [519, 581], // Unschooled, Silence
  },
];

/**
 * Searches the curated niche vocabulary bank for matching concepts or words.
 */
export function searchNicheVocabulary(
  queryTokens: string[]
): (NicheWordEntry & { matchScore: number })[] {
  if (queryTokens.length === 0) return [];
  const normalizedTokens = queryTokens
    .map((t) => t.toLowerCase().trim())
    .filter((t) => t.length > 2);
  if (normalizedTokens.length === 0) return [];

  const matched: (NicheWordEntry & { matchScore: number })[] = [];

  for (const entry of NICHE_VOCABULARY) {
    let score = 0;
    const matchedTokenSet = new Set<string>();
    const entryWord = entry.word.toLowerCase();
    const entryDef = entry.definition.toLowerCase();

    for (const token of normalizedTokens) {
      if (entryWord === token) {
        score += 20.0;
        matchedTokenSet.add(token);
      } else if (entryWord.includes(token)) {
        score += 8.0;
        matchedTokenSet.add(token);
      }

      // Check concept triggers
      for (const c of entry.concepts) {
        const cLower = c.toLowerCase();
        if (cLower === token) {
          score += 6.0;
          matchedTokenSet.add(token);
        } else if (cLower.includes(token) || token.includes(cLower)) {
          score += 3.0;
          matchedTokenSet.add(token);
        }
      }

      // Check definition words
      if (entryDef.includes(token)) {
        score += 2.0;
        matchedTokenSet.add(token);
      }
    }

    if (score > 0 && matchedTokenSet.size > 0) {
      // Overlap ratio penalty if only 1 token matched in a multi-token query
      const overlapRatio = matchedTokenSet.size / normalizedTokens.length;
      const calibratedScore = score * Math.pow(overlapRatio, 1.2);
      matched.push({ ...entry, matchScore: calibratedScore });
    }
  }

  matched.sort((a, b) => b.matchScore - a.matchScore);
  return matched;
}
