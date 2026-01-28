/**
 * The search passed by Raycast if the user searched directly from the root.
 */
interface SearchArguments {
  term: string;
}

/**
 * The search state for the main search function which
 * fetches from the https://jotoba.de/api/search/words endpoint.
 */
interface SearchState {
  searchText: string;
  results: JotobaWordsSearchResults;
  isLoading: boolean;
}

/**
 *  Used in the SearchState interface. Basically the shape of the results
 *  returned by the https://jotoba.de/api/search/words endpoint.
 */
interface JotobaWordsSearchResults {
  words: WordResult[];
  kanji: KanjiResult[];
}

/** The shape of the word search results in the main search view. */
interface WordResult extends JotobaWord {
  id: string;
}

/** The shape of the kanji search results in the main search view. */
interface KanjiResult extends JotobaKanji {
  id: string;
}

/** The shape of the Jotoba part of speech data point. */
interface PartOfSpeech {
  [groupName: string]:
    | string
    | {
        [typeName: string]: string;
      };

  language: string;
}

/** The shape of the Jotoba sense data point. */
interface Sense {
  glosses: string[];
  pos: PartOfSpeech[];
  language: string;
}

/** The shape of Jotoba word data/entries  */
interface JotobaWord {
  reading: {
    kana: string; // kana reading is always available
    kanji?: string;
    furigana?: string;
  };
  common: boolean;
  senses: Sense[];
  audio?: string;
  pitch?: [
    {
      part: string;
      high: boolean;
    },
  ];
  url: string;
}

/** The shape of Jotoba kanji data/entries  */
interface JotobaKanji {
  literal: string;
  meanings: string[];
  grade?: number;
  stroke_count?: number;
  frequency?: number;
  jlpt?: number;
  onyomi?: string[];
  kunyomi?: string[];
  chinese?: string[];
  korean_r?: string[];
  korean_h?: string[];
  parts: string[];
  radical: string;
  stroke_frames?: string;
}

/**
 * The shape of Jotoba name entries from the
 * https://jotoba.de/api/search/names endpoint.
 */
interface JotobaName {
  kana: string;
  kanji: string;
  transcription: string;
  name_type?: Json[];
}

/**
 * The shape of the Jotoba sentence entries frome the
 * https://jotoba.de/api/search/sentences endpoint.
 */
interface JotobaSentence {
  content: string;
  furigana?: string;
  translation: string;
  language: string;
}

/** Jotoba API results */
interface JotobaResults {
  [key: string]: JotobaWord[] | JotobaKanji[] | JotobaSentence[] | JotobaName[];
}

/**
 * Jotoba API POST request body data shape for...
 *  - https://jotoba.de/api/search/words
 *  - https://jotoba.de/api/search/kanji
 *  - https://jotoba.de/api/search/sentences
 *  - https://jotoba.de/api/search/names
 *  - https://jotoba.de/api/suggestion
 *      - CAVEAT: language uses a different string format.
 *           https://jotoba.de/docs.html#post-/api/suggestion
 */
interface JotobaBodyData {
  query: string;
  no_english: boolean;
  language: string;
}

/**
 * Raycast extensions preferences shape for getPreferenceValues()
 */
interface Preferences {
  userLanguage: string;
  useEnglishFallback: boolean;
  posDisplayType: string;
  detailsPosDisplayType: string;
  kanjiDetailsTitleDisplayType: string;
  showDetailsInList: string;
  commonWordsFirst: boolean;
}

interface fetchAsyncConfig {
  method: "GET" | "POST";
  signal?: AbortSignal;
  bodyData?: object;
}

/**
 * A data JSON shape... Sort of a catch-all but...
 */
type Json = string | number | boolean | null | { [x: string]: Json } | Array<Json> | Partial<Record<string, Json>>;

export as namespace raycastJotoba;
