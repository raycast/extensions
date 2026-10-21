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
      'anagnorisis',
      'dramatic discovery',
      'critical discovery',
      'recognition scene',
      'revelation of identity',
      'tragic revelation',
      'tragic discovery',
      'dramatic epiphany',
      'unveiling truth',
    ],
    categories: [484, 522, 599], // Discovery, Interpretation/Denouement, The Drama
    example: 'In Sophocles\' Oedipus Rex, the terrible anagnorisis occurs when Oedipus discovers he killed his father.',
  },
  {
    word: 'peripeteia',
    partOfSpeech: 'noun',
    definition: 'A sudden reversal of fortune or change in circumstances, especially in a dramatic or narrative work.',
    concepts: [
      'peripeteia',
      'reversal of fortune',
      'dramatic reversal',
      'tragic reversal',
      'sudden reversal',
      'plot twist',
      'downfall of protagonist',
    ],
    categories: [146, 599], // Reversal, The Drama
    example: 'The play\'s peripeteia turns the triumphant protagonist into a penniless fugitive.',
  },
  {
    word: 'hamartia',
    partOfSpeech: 'noun',
    definition: 'A fatal flaw or tragic error in judgment leading to the downfall of a hero.',
    concepts: [
      'hamartia',
      'fatal flaw',
      'tragic flaw',
      'tragic error',
      'error in judgment',
      'fatal mistake of hero',
    ],
    categories: [495, 599, 945], // Error, The Drama, Guilt
    example: 'His unchecked hubris was the classic hamartia that brought ruin upon his house.',
  },
  {
    word: 'catharsis',
    partOfSpeech: 'noun',
    definition: 'The process of releasing and thereby providing relief from strong, repressed, or pent-up emotions through art or drama.',
    concepts: [
      'catharsis',
      'emotional release',
      'emotional cleansing',
      'cathartic release',
      'dramatic purgation',
      'artistic release',
    ],
    categories: [652, 824, 599], // Cleansing, Relief, The Drama
    example: 'Watching the tragic ending provided the audience with an overwhelming sense of catharsis.',
  },
  {
    word: 'eucatastrophe',
    partOfSpeech: 'noun',
    definition: 'A sudden, unexpected turn of events at the climax of a story that saves the protagonist from impending doom.',
    concepts: [
      'eucatastrophe',
      'miraculous turnaround',
      'sudden happy ending',
      'fairy tale salvation',
      'deliverance from doom',
    ],
    categories: [522, 618, 827], // Solution, Good, Joy
    example: 'Tolkien coined eucatastrophe to describe the sudden joy of miraculous grace at the narrative brink of despair.',
  },
  {
    word: 'defamiliarization',
    partOfSpeech: 'noun',
    definition: 'The artistic technique of presenting common things in an unfamiliar or strange way to enhance perception.',
    concepts: [
      'defamiliarization',
      'artistic estrangement',
      'ostranenie',
      'presenting familiar as strange',
      'unfamiliar perspective',
    ],
    categories: [83, 569, 599], // Novelty, Figure of Speech, The Drama
    example: 'Through defamiliarization, the poet makes an ordinary chair appear as a mysterious sculptural form.',
  },
  {
    word: 'bathos',
    partOfSpeech: 'noun',
    definition: 'An effect of anticlimax created by an unintentional lapse in mood from the sublime to the trivial or ridiculous.',
    concepts: [
      'bathos',
      'anticlimax',
      'sublime to ridiculous',
      'unintentional anticlimax',
      'ludicrous descent',
    ],
    categories: [569, 856], // Figure of Speech, Ridiculousness
    example: 'The solemn funeral eulogy plunged into pure bathos when the speaker complained about the parking fees.',
  },
  {
    word: 'denouement',
    partOfSpeech: 'noun',
    definition: 'The final part of a play, film, or narrative in which the strands of the plot are drawn together and matters are resolved.',
    concepts: [
      'denouement',
      'plot resolution',
      'narrative resolution',
      'unraveling of plot',
      'final outcome of drama',
    ],
    categories: [67, 522, 599], // End, Interpretation, The Drama
  },
  {
    word: 'hubris',
    partOfSpeech: 'noun',
    definition: 'Excessive pride, presumption, or arrogance toward the gods or moral limits that invites retribution.',
    concepts: [
      'hubris',
      'fatal pride',
      'excessive pride',
      'hubristic arrogance',
      'overweening pride',
    ],
    categories: [880, 599], // Vanity/Pride, The Drama
  },
  {
    word: 'bildungsroman',
    partOfSpeech: 'noun',
    definition: 'A novel dealing with one person\'s formative years, spiritual education, or psychological development (coming of age).',
    concepts: [
      'bildungsroman',
      'coming of age novel',
      'formative years story',
      'spiritual education novel',
      'youth maturation story',
    ],
    categories: [537, 594], // Teaching, Description/Literature
  },
  {
    word: 'verisimilitude',
    partOfSpeech: 'noun',
    definition: 'The appearance or semblance of being true, authentic, or real in art and literature.',
    concepts: [
      'verisimilitude',
      'appearance of truth',
      'artistic realism',
      'narrative authenticity',
      'lifelike illusion',
    ],
    categories: [494, 543], // Truth, Veracity
  },
  {
    word: 'deus ex machina',
    partOfSpeech: 'noun',
    definition: 'An unexpected power, event, or contrived device that artificially resolves a seemingly hopeless situation.',
    concepts: [
      'deus ex machina',
      'contrived plot device',
      'artificial resolution',
      'miraculous plot intervention',
      'unrealistic resolution',
    ],
    categories: [599, 704], // The Drama, Facility
  },

  // --- RHETORIC & LINGUISTICS ---
  {
    word: 'aporia',
    partOfSpeech: 'noun',
    definition: 'An irresolvable internal contradiction or logical impasse in a text, argument, or philosophical theory.',
    concepts: [
      'aporia',
      'philosophical impasse',
      'logical contradiction',
      'irresolvable doubt',
      'philosophical puzzle',
    ],
    categories: [475, 514], // Doubt, Difficulty
  },
  {
    word: 'chiasmus',
    partOfSpeech: 'noun',
    definition: 'A rhetorical figure in which words, grammatical constructions, or concepts are repeated in reverse order.',
    concepts: [
      'chiasmus',
      'criss-cross rhetorical figure',
      'inverted parallelism',
      'reverse order rhetoric',
    ],
    categories: [569, 573], // Figure of Speech, Style
  },
  {
    word: 'synecdoche',
    partOfSpeech: 'noun',
    definition: 'A figure of speech in which a part is made to represent the whole, or vice versa (e.g. "suits" for businesspeople).',
    concepts: [
      'synecdoche',
      'part for the whole',
      'figure of speech whole for part',
      'rhetorical part for whole',
    ],
    categories: [569], // Figure of Speech
  },
  {
    word: 'metonymy',
    partOfSpeech: 'noun',
    definition: 'The substitution of the name of an attribute or adjunct for that of the thing meant (e.g. "the crown" for the monarchy).',
    concepts: [
      'metonymy',
      'attribute for the thing',
      'substituted name figure of speech',
      'rhetorical association',
    ],
    categories: [569],
  },
  {
    word: 'sesquipedalian',
    partOfSpeech: 'adjective',
    definition: 'Given to or characterized by the use of long, multisyllabic, and complex words.',
    concepts: [
      'sesquipedalian',
      'polysyllabic words',
      'long words lover',
      'grandiloquent vocabulary',
      'sesquipedalianism',
    ],
    categories: [573], // Verbosity
  },
  {
    word: 'portmanteau',
    partOfSpeech: 'noun',
    definition: 'A word blending the sounds and meanings of two distinct words (e.g. "brunch" from breakfast and lunch).',
    concepts: [
      'portmanteau',
      'blend word',
      'hybrid word',
      'blended words',
      'combination word',
    ],
    categories: [562], // Word
  },
  {
    word: 'litotes',
    partOfSpeech: 'noun',
    definition: 'An ironic understatement in which an affirmative is expressed by the negative of its contrary (e.g. "not bad" for good).',
    concepts: [
      'litotes',
      'ironic understatement',
      'double negative affirmation',
      'understatement by denying contrary',
    ],
    categories: [569],
  },

  // --- PSYCHOLOGY, EMOTIONS & HUMAN EXPERIENCE ---
  {
    word: 'schadenfreude',
    partOfSpeech: 'noun',
    definition: 'Pleasure or satisfaction derived by someone from another person\'s misfortune or bad luck.',
    concepts: [
      'schadenfreude',
      'pleasure at misfortune',
      'malicious joy',
      'gloating at failure of others',
    ],
    categories: [827, 907], // Pleasure, Malice
  },
  {
    word: 'saudade',
    partOfSpeech: 'noun',
    definition: 'A deep, melancholic longing or nostalgia for someone or something that is absent or irrevocably lost.',
    concepts: [
      'saudade',
      'melancholic longing',
      'nostalgic yearning for lost',
      'wistful yearning for absent',
    ],
    categories: [833, 837], // Longing, Dejection
  },
  {
    word: 'alexithymia',
    partOfSpeech: 'noun',
    definition: 'The subclinical inability to identify, recognize, and verbally describe one\'s own emotions.',
    concepts: [
      'alexithymia',
      'emotional blindness',
      'inability to identify emotions',
      'inability to describe feelings',
    ],
    categories: [823], // Insensibility
  },
  {
    word: 'weltschmerz',
    partOfSpeech: 'noun',
    definition: 'A feeling of melancholy and world-weariness caused by comparison of the actual state of the world with an ideal state.',
    concepts: [
      'weltschmerz',
      'world-weariness',
      'melancholy at world state',
      'romantic pessimism',
    ],
    categories: [837, 853], // Dejection, Discontent
  },
  {
    word: 'ennui',
    partOfSpeech: 'noun',
    definition: 'A feeling of listlessness, boredom, and dissatisfaction arising from a lack of occupation or excitement.',
    concepts: [
      'ennui',
      'existential boredom',
      'listless dissatisfaction',
      'tedium of existence',
    ],
    categories: [841], // Weariness
  },
  {
    word: 'sprezzatura',
    partOfSpeech: 'noun',
    definition: 'Studied carelessness; the art of performing a difficult action so as to make it seem effortless and natural.',
    concepts: [
      'sprezzatura',
      'studied carelessness',
      'effortless grace',
      'artful nonchalance',
      'concealing effort',
    ],
    categories: [698, 700], // Skill, Conduct
  },
  {
    word: 'quixotic',
    partOfSpeech: 'adjective',
    definition: 'Exceedingly idealistic, unrealistic, impractical, and chivalrous in pursuit of noble ideals.',
    concepts: [
      'quixotic',
      'hopelessly idealistic',
      'impractically chivalrous',
      'unrealistic romanticism',
      'foolishly noble',
    ],
    categories: [515, 861], // Imagination, Courage
  },
  {
    word: 'apophenia',
    partOfSpeech: 'noun',
    definition: 'The tendency to perceive meaningful patterns or connections between unrelated or random things.',
    concepts: [
      'apophenia',
      'perceiving patterns in random data',
      'unrelated patterns illusion',
      'patternicity',
    ],
    categories: [515, 495], // Imagination, Error
  },
  {
    word: 'sonder',
    partOfSpeech: 'noun',
    definition: 'The profound realization that each random passerby is living a life as vivid, intricate, and complex as your own.',
    concepts: [
      'sonder',
      'realization strangers have vivid lives',
      'awareness of passersby lives',
      'existential empathy for strangers',
    ],
    categories: [498, 888], // Judgment, Sympathy
  },

  // --- NATURE, SENSORY & SCIENCE ---
  {
    word: 'petrichor',
    partOfSpeech: 'noun',
    definition: 'A pleasant, distinctive smell that frequently accompanies the first rain after a long period of warm, dry weather.',
    concepts: [
      'petrichor',
      'smell of rain',
      'earthy scent after rain',
      'aroma of rain on dry earth',
    ],
    categories: [398], // Odor / Fragrance
  },
  {
    word: 'syzygy',
    partOfSpeech: 'noun',
    definition: 'A straight-line configuration of three or more celestial bodies in a gravitational system (such as Sun, Earth, and Moon during an eclipse).',
    concepts: [
      'syzygy',
      'celestial alignment',
      'straight line of three planets',
      'eclipse alignment of sun earth moon',
    ],
    categories: [70, 318], // Conjunction, Astronomy
  },
  {
    word: 'crepuscular',
    partOfSpeech: 'adjective',
    definition: 'Resembling or relating to twilight; active primarily during the twilight hours of dawn and dusk.',
    concepts: [
      'crepuscular',
      'active at twilight',
      'dawn or dusk active',
      'crepuscular animals',
      'twilight dwelling',
    ],
    categories: [422], // Dimness
  },
  {
    word: 'susurrus',
    partOfSpeech: 'noun',
    definition: 'A soft, whispering, murmuring, or rustling sound like wind through leaves or gentle waves.',
    concepts: [
      'susurrus',
      'whispering sound of wind',
      'rustling leaves murmur',
      'soft murmuring sound',
    ],
    categories: [405], // Faint Sound
  },
  {
    word: 'liminality',
    partOfSpeech: 'noun',
    definition: 'The quality of ambiguity or disorientation that occurs in the middle stage of a transition, threshold, or passage.',
    concepts: [
      'liminality',
      'liminal space',
      'transition threshold',
      'in-between transitional state',
      'threshold passage',
    ],
    categories: [227, 232], // Limit, Middle
  },
  {
    word: 'palimpsest',
    partOfSpeech: 'noun',
    definition: 'A manuscript or surface on which the original writing has been effaced to make room for later writing, but of which traces remain.',
    concepts: [
      'palimpsest',
      'erased manuscript',
      'overwritten parchment',
      'layered historical traces',
    ],
    categories: [552, 590], // Erasure, Writing
  },
  {
    word: 'ouroboros',
    partOfSpeech: 'noun',
    definition: 'An ancient circular symbol depicting a serpent or dragon eating its own tail, symbolizing eternity, cycles, and renewal.',
    concepts: [
      'ouroboros',
      'snake eating tail',
      'serpent swallowing tail',
      'eternal cycle circular symbol',
    ],
    categories: [247, 112], // Circularity, Perpetuity
  },
  {
    word: 'callipygian',
    partOfSpeech: 'adjective',
    definition: 'Having well-shaped, beautiful buttocks.',
    concepts: [
      'callipygian',
      'shapely buttocks',
      'beautiful buttocks',
      'aesthetically shaped buttocks',
    ],
    categories: [845], // Beauty
  },
  {
    word: 'serendipity',
    partOfSpeech: 'noun',
    definition: 'The occurrence and development of events by chance in a happy, fortunate, or beneficial way.',
    concepts: [
      'serendipity',
      'happy accident',
      'fortunate coincidence',
      'beneficial surprise discovery',
    ],
    categories: [156, 734], // Chance, Prosperity
  },
  {
    word: 'ineffable',
    partOfSpeech: 'adjective',
    definition: 'Too great, sacred, or extreme to be expressed or described in words.',
    concepts: [
      'ineffable',
      'too great to be expressed in words',
      'indescribable awe',
      'ineffable transcendence',
      'beyond words',
    ],
    categories: [519, 581], // Unschooled, Silence
  },
  {
    word: 'edificial',
    partOfSpeech: 'adjective',
    definition: 'Pertaining to or having the imposing, structural character of an edifice; grand, monumental, and architecturally complex.',
    concepts: [
      'edificial',
      'imposing complex',
      'large imposing complex',
      'monumental structure',
      'grand architectural edifice',
      'imposing architectural complex',
    ],
    categories: [189, 554, 842], // Abode, Structure, Importance
  },
  {
    word: 'edifice',
    partOfSpeech: 'noun',
    definition: 'A building, structure, or architectural complex, especially one of large size or imposing appearance.',
    concepts: [
      'edifice',
      'large imposing structure',
      'architectural complex',
      'imposing building complex',
      'monumental edifice',
      'large imposing complex',
    ],
    categories: [189, 554, 842], // Abode, Structure, Importance
  },
  {
    word: 'palatial',
    partOfSpeech: 'adjective',
    definition: 'Resembling or having the grand, stately scale of a palace; magnificently spacious, luxurious, and imposing.',
    concepts: [
      'palatial',
      'grand stately residence',
      'palatial luxury',
      'regal palace architecture',
      'palatial mansion',
    ],
    categories: [189, 206, 842], // Abode, Size, Importance
  },
  {
    word: 'monolithic',
    partOfSpeech: 'adjective',
    definition: 'Formed of a single massive block of stone; having a massive, uniform, and imposing structure.',
    concepts: [
      'monolithic',
      'massive stone monument',
      'monolithic structure',
      'uniform massive scale',
      'single stone monolith',
    ],
    categories: [192, 240, 842], // Dimensions, Form, Importance
  },
  {
    word: 'labyrinthine',
    partOfSpeech: 'adjective',
    definition: 'Resembling a labyrinth; intricate, convoluted, confusing, and winding like a complex network of passages.',
    concepts: [
      'labyrinthine',
      'confusing twisting passages',
      'intricate maze network',
      'labyrinthine complexity',
      'convoluted passages',
    ],
    categories: [248, 514, 704], // Convolution, Difficulty, Facility
  },
  {
    word: 'colossal',
    partOfSpeech: 'adjective',
    definition: 'Of extraordinary, immense, or breathtaking size or scale, resembling a colossus.',
    concepts: [
      'colossal',
      'gigantic colossal scale',
      'colossal monument',
      'immense breathtaking size',
      'colossal stature',
    ],
    categories: [31, 192, 842], // Greatness, Dimensions, Importance
  },
  {
    word: 'elysian',
    partOfSpeech: 'adjective',
    definition: 'Relating to Elysium; blissful, delightful, divinely peaceful, and heavenly.',
    concepts: [
      'elysian',
      'elysian bliss',
      'paradisiacal peace',
      'heavenly elysian fields',
      'divinely blissful',
    ],
    categories: [827, 981, 987], // Pleasure, Heaven, Piety
  },
  {
    word: 'tenebrous',
    partOfSpeech: 'adjective',
    definition: 'Dark, shadowy, gloomy, and obscure; shut off from light.',
    concepts: [
      'tenebrous',
      'tenebrous darkness',
      'gloomy shadowy obscurity',
      'tenebrous abyss',
      'dark tenebrous night',
    ],
    categories: [421, 422, 517], // Darkness, Dimness, Obscurity
  },
  {
    word: 'recondite',
    partOfSpeech: 'adjective',
    definition: 'Dealing with very profound, difficult, or abstruse subject matter beyond normal understanding.',
    concepts: [
      'recondite',
      'recondite knowledge',
      'profound obscure learning',
      'abstruse recondite subject',
      'deep esoteric study',
    ],
    categories: [490, 519, 526], // Knowledge, Secret, Obscurity
  },
  {
    word: 'antediluvian',
    partOfSpeech: 'adjective',
    definition: 'Belonging to the era before the Biblical flood; extraordinarily ancient, primitive, or venerable.',
    concepts: [
      'antediluvian',
      'antediluvian antiquity',
      'ancient prehistoric era',
      'antediluvian origin',
      'relic of antiquity',
    ],
    categories: [122, 124, 842], // Oldness, Antiquity, Importance
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
  const queryPhrase = normalizedTokens.join(' ');

  for (const entry of NICHE_VOCABULARY) {
    let score = 0;
    const matchedTokenSet = new Set<string>();
    const entryWord = entry.word.toLowerCase();

    // 1. Exact or prefix match on the headword itself
    for (const token of normalizedTokens) {
      if (entryWord === token) {
        score += 25.0;
        matchedTokenSet.add(token);
      } else if (entryWord.startsWith(token) && token.length >= 4) {
        score += 12.0;
        matchedTokenSet.add(token);
      }
    }

    // 2. Concept matching
    for (const c of entry.concepts) {
      const cLower = c.toLowerCase();
      const conceptWords = cLower.split(/\s+/).filter((w) => w.length > 2);

      // Check if full concept phrase is contained in query or vice-versa
      if (cLower === queryPhrase) {
        score += 20.0;
        for (const w of conceptWords) {
          if (normalizedTokens.includes(w)) matchedTokenSet.add(w);
        }
      } else if (queryPhrase.includes(cLower)) {
        score += 16.0;
        for (const w of conceptWords) {
          if (normalizedTokens.includes(w)) matchedTokenSet.add(w);
        }
      } else if (conceptWords.length > 1) {
        // Multi-word concept: count how many query tokens match its words
        let wordsMatched = 0;
        for (const w of conceptWords) {
          if (normalizedTokens.includes(w)) {
            wordsMatched++;
            matchedTokenSet.add(w);
          }
        }
        if (wordsMatched === conceptWords.length) {
          // All words in the concept matched
          score += 15.0;
        } else if (wordsMatched > 1 && wordsMatched / conceptWords.length >= 0.6) {
          // Majority of words matched
          score += 8.0 * (wordsMatched / conceptWords.length);
        } else if (wordsMatched === 1 && normalizedTokens.length === 1) {
          // Single-word query matching 1 word of a multi-word concept gets negligible score
          score += 1.0;
        }
      } else if (conceptWords.length === 1) {
        // Single word concept
        const single = conceptWords[0];
        if (normalizedTokens.includes(single)) {
          score += 14.0;
          matchedTokenSet.add(single);
        }
      }
    }

    // 3. Subtle definition bonus ONLY if query has multiple tokens and a concept already matched
    if (score >= 8.0 && normalizedTokens.length >= 2) {
      const entryDef = entry.definition.toLowerCase();
      let defHits = 0;
      for (const token of normalizedTokens) {
        if (token.length >= 4 && entryDef.includes(token)) {
          defHits++;
        }
      }
      if (defHits > 0) {
        score += Math.min(3.0, defHits * 0.8);
      }
    }

    if (score > 0 && matchedTokenSet.size > 0) {
      // Calibrate score with overlap ratio
      const overlapRatio = Math.min(1.0, matchedTokenSet.size / normalizedTokens.length);
      const calibratedScore = score * Math.pow(overlapRatio, 1.5);
      if (calibratedScore >= 4.0) {
        matched.push({ ...entry, matchScore: calibratedScore });
      }
    }
  }

  matched.sort((a, b) => b.matchScore - a.matchScore);
  return matched;
}
