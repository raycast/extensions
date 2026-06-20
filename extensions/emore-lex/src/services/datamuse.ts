type DatamuseWord = {
  word: string;
};

export async function fetchSynonyms(word: string): Promise<string[]> {
  const response = await fetch(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(word)}&max=8`);
  if (!response.ok) return [];

  const data = (await response.json()) as DatamuseWord[];
  return data.map((item) => item.word).filter(Boolean);
}
