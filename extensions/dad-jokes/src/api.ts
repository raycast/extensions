export type Joke = {
  id: string;
  joke: string;
  status: number;
};

type SearchResponse = {
  results: Joke[];
  search_term: string;
  status: number;
  total_jokes: number;
};

const headers = {
  Accept: "application/json",
};

export async function fetchRandomJoke(): Promise<Joke> {
  const response = await fetch("https://icanhazdadjoke.com/", { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch joke: ${response.statusText}`);
  }

  return (await response.json()) as Joke;
}

export async function searchJokes(term: string, limit = 3): Promise<Joke[]> {
  const response = await fetch(`https://icanhazdadjoke.com/search?term=${encodeURIComponent(term)}&limit=${limit}`, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to search jokes: ${response.statusText}`);
  }

  const data = (await response.json()) as SearchResponse;
  return data.results;
}
