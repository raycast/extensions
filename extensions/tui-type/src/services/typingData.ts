import { Quote } from "../types";

export interface ITypingDataSource {
  getLanguages(): Promise<string[]>;
  getWords(language: string): Promise<string[]>;
  getQuotes(language: string): Promise<Quote[]>;
}

const formatLanguageName = (filename: string) => filename.replace(".json", "");

export class MonkeyTypeGitHubSource implements ITypingDataSource {
  private baseUrl =
    "https://raw.githubusercontent.com/monkeytypegame/monkeytype";
  private apiBaseUrl =
    "https://api.github.com/repos/monkeytypegame/monkeytype/contents/frontend/static/languages";

  async getLanguages(): Promise<string[]> {
    const response = await fetch(this.apiBaseUrl);
    if (!response.ok) throw new Error("Failed to fetch languages");

    return (await response.json())
      .filter((file: { name: string; download_url: string; type: string }) =>
        file.name.endsWith(".json"),
      )
      .map((file: { name: string; download_url: string; type: string }) =>
        formatLanguageName(file.name),
      );
  }

  async getWords(language: string): Promise<string[]> {
    const url = `${this.baseUrl}/master/frontend/static/languages/${language}.json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch words for ${language}`);

    const data = await response.json();
    return data.words;
  }

  async getQuotes(language: string): Promise<Quote[]> {
    const url = `${this.baseUrl}/refs/heads/master/frontend/static/quotes/${language}.json`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`Quotes not found for ${language}, returning empty set.`);
      return [];
    }

    const data = await response.json();
    return data.quotes;
  }
}

export const typingService = new MonkeyTypeGitHubSource();
