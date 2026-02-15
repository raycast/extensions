export interface DatamuseItem {
  word: string;
  score: number;
  tags?: string[];
}

export interface DatamuseResult {
  category: string;
  items: string[];
}

const BASE_URL = "https://api.datamuse.com";

export const CATEGORIES: Record<string, { endpoint: string; param: string }> = {
  Similars: { endpoint: "words", param: "ml" },
  Synonyms: { endpoint: "words", param: "rel_syn" },
  Antonyms: { endpoint: "words", param: "rel_ant" },
  Evocative: { endpoint: "words", param: "rel_trg" },
  "Sounds Like": { endpoint: "words", param: "sl" },
  "Similar Spelling": { endpoint: "words", param: "sp" },
  Rhymes: { endpoint: "words", param: "rel_rhy" },
  "Adjectives for word": { endpoint: "words", param: "rel_jjb" },
  "Nouns for word": { endpoint: "words", param: "rel_jja" },
  Suggestions: { endpoint: "sug", param: "s" },
};

async function fetchCategory(word: string, category: string, topic?: string, max = 20): Promise<DatamuseResult> {
  const { endpoint, param } = CATEGORIES[category];
  const queryParams = new URLSearchParams({ [param]: word, max: max.toString() });
  if (topic) queryParams.append("topics", topic);

  const url = `${BASE_URL}/${endpoint}?${queryParams.toString()}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.statusText);
    const data = (await res.json()) as DatamuseItem[];
    return {
      category,
      items: data.filter((item) => item.word.toLowerCase() !== word.toLowerCase()).map((item) => item.word),
    };
  } catch {
    return { category, items: [] };
  }
}

export async function fetchDatamuseData(wordInput: string, categoryFilter?: string): Promise<DatamuseResult[]> {
  const [word, topic] = wordInput.split(":");

  const categoriesToFetch = categoryFilter ? [categoryFilter] : Object.keys(CATEGORIES);

  const results = await Promise.all(categoriesToFetch.map((cat) => fetchCategory(word, cat, topic)));

  return results.filter((res) => res.items.length > 0);
}
