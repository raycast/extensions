import { LocalStorage } from "@raycast/api";

interface HistoryEntry {
  language: string;
  languageCode: string;
  word: string;
  epoch: number;
}

class History {
  private static key: string = "history";
  private static maxEntries: number = 50;

  /**
   * Retrieves all history entries from local storage.
   *
   * @returns {Promise<HistoryEntry[]>} A promise that resolves to an array of history entries.
   */
  public static async getEntries(): Promise<HistoryEntry[]> {
    const data = await LocalStorage.getItem<string>(History.key);
    return data ? (JSON.parse(data) as HistoryEntry[]) : [];
  }

  /**
   * Adds a new entry to the history list if it does not already exist.
   *
   * @param {string} language The language of the word to add.
   * @param {string} languageCode The language code of the word to add.
   * @param {string} word The word to add to the history.
   *
   * @returns {Promise<boolean>} A promise that resolves to `true` if the operation was successful, `false` otherwise.
   */
  public static async addEntry(language: string, languageCode: string, word: string): Promise<boolean> {
    let result: boolean = true;
    try {
      const history: HistoryEntry[] = await this.getEntries();
      const exists: boolean = await History.exist(language.toLowerCase(), word);

      if (!exists) {
        history.push({
          language: language.trim().toLowerCase().replace("  ", " "),
          languageCode: languageCode.toLowerCase(),
          word: word,
          epoch: Date.now(),
        });
        history.sort((a: HistoryEntry, b: HistoryEntry) => b.epoch - a.epoch);
        LocalStorage.setItem(History.key, JSON.stringify(history.slice(0, History.maxEntries)));
      } else {
        result = true;
      }
    } catch {
      result = false;
    }
    return result;
  }

  /**
   * Removes an entry matching the specified language and word from the history.
   *
   * @param {string} language The language of the entry to remove.
   * @param {string} word The word of the entry to remove.
   *
   * @returns {Promise<boolean>} A promise that resolves to `true` if the operation was successful, `false` otherwise.
   */
  public static async removeEntry(language: string, word: string): Promise<boolean> {
    let result: boolean = true;
    try {
      const history: HistoryEntry[] = await this.getEntries();
      const updatedHistory = history.filter(
        (he: HistoryEntry) =>
          he.language.toLowerCase() !== language.toLowerCase() || he.word.toLowerCase() !== word.toLowerCase(),
      );
      LocalStorage.setItem(History.key, JSON.stringify(updatedHistory));
    } catch {
      result = false;
    }
    return result;
  }

  /**
   * Removes all entries in the history from local storage.
   *
   * @returns {Promise<boolean>} A promise that resolves to `true` if the operation was successful, `false` otherwise.
   */
  public static async removeAll(): Promise<boolean> {
    let result = true;
    try {
      await LocalStorage.removeItem(History.key);
    } catch {
      result = false;
    }
    return result;
  }

  /**
   * Determines whether a given word in a specified language is in the last 10 history entries.
   *
   * @param {string} language The language of the word to check.
   * @param {string} word The word to check for in the history.
   *
   * @returns {boolean} Wether the word and language combination is in the last 10 history entries.
   */
  public static async exist(language: string, word: string): Promise<boolean> {
    const history: HistoryEntry[] = await this.getEntries();
    const lastTen: HistoryEntry[] = history.slice(-10);
    return lastTen.some((fav: HistoryEntry) => fav.language === language && fav.word === word);
  }
}

export default History;
export type { HistoryEntry };
