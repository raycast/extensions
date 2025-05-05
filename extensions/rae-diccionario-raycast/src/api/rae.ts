import fetch from "node-fetch";

const API_BASE_URL = "https://rae-api.com";

export interface WordMeaning {
  meaning_number: number;
  category: string;
  description: string;
}

export interface Word {
  word: string;
}

export interface WordEntry extends Word {
  meanings: {
    senses: WordMeaning[];
  }[];
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data: T;
  error?: string;
}

export type WordOnlyResponse = ApiResponse<Word>;

export type WordEntryResponse = ApiResponse<WordEntry>;

// Helper function to make API requests and handle errors
async function makeApiRequest<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Error en la petición: ${response.statusText}`);
  }

  const res = (await response.json()) as ApiResponse<T>;

  if (!res.ok) {
    // Handle the common error structure: {"error":"NOT_FOUND","ok":false}
    const errorMsg = res.error === "NOT_FOUND" ? "Palabra no encontrada" : res.error;
    throw new Error(`Error en la respuesta de la API: ${errorMsg}`);
  }

  return res.data;
}

export const searchWord = async (word: string): Promise<WordEntry> => {
  return makeApiRequest<WordEntry>(`${API_BASE_URL}/api/words/${encodeURIComponent(word)}`);
};

export const getDailyWord = async (): Promise<WordEntry> => {
  const res = await makeApiRequest<Word>(`${API_BASE_URL}/api/daily`);
  return searchWord(res.word);
};

export const getRandomWord = async (minLength?: number, maxLength?: number): Promise<WordEntry> => {
  let url = `${API_BASE_URL}/api/random`;
  const params = new URLSearchParams();

  if (minLength) params.append("min_length", minLength.toString());
  if (maxLength) params.append("max_length", maxLength.toString());

  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  const res = await makeApiRequest<Word>(url);
  return searchWord(res.word);
};
