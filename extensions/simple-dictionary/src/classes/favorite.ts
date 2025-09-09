import { LocalStorage } from "@raycast/api";

interface FavoriteEntry {
  language: string;
  word: string;
  markdown: string;
  url: string;
  entry: number;
  partOfSpeech: string;
}

class Favorite {
  private static key: string = "favorites";

  /**
   * Formats the input text by trimming whitespace, converting to lowercase,
   * and replacing double spaces with single spaces.
   *
   * @param {string} t The input string to format.
   * @returns {string} The formatted string.
   */
  private static formatText(t: string): string {
    return t.trim().toLowerCase().replace("  ", " ");
  }

  /**
   * Retrieves the list of favorite entries from local storage.
   *
   * @returns {FavoriteEntry[]} An array of favorite entries. Returns an empty array if no entries are found.
   */
  public static async getEntries(): Promise<FavoriteEntry[]> {
    const entries = await LocalStorage.getItem(Favorite.key);
    return entries ? JSON.parse(entries.toString()) : [];
  }

  /**
   * Adds a new entry to the favorites list if it does not already exist.
   *
   * @param {string} language The language of the word to add.
   * @param {string} word The word to add to favorites.
   * @param {string} markdown The markdown details associated with the word.
   * @param {string} url The URL that the word was sourced from.
   * @param {number} entry The entry number associated with the word.
   *
   * Checks if the combination of language and word already exists in the favorites.
   * If not, formats the language and word, adds them to the favorites, and updates LocalStorage.
   */
  public static async addEntry(
    language: string,
    word: string,
    markdown: string,
    url: string,
    entry: number,
    partOfSpeech: string,
  ): Promise<void> {
    const favorites: FavoriteEntry[] = await this.getEntries();
    const exists: boolean = favorites.find(
      (fav: FavoriteEntry) =>
        fav.language === language && fav.word === word && fav.entry === entry && fav.partOfSpeech === partOfSpeech,
    )
      ? true
      : false;

    if (!exists) {
      favorites.push({
        language: this.formatText(language),
        word: this.formatText(word),
        markdown,
        url,
        entry,
        partOfSpeech,
      });
      favorites.sort((a, b) => a.word.localeCompare(b.word));
      LocalStorage.setItem(Favorite.key, JSON.stringify(favorites));
    }
  }

  /**
   * Removes a favorite entry matching the specified language and word from the stored favorites.
   *
   * @param {string} language The language of the entry to remove.
   * @param {string} word The word of the entry to remove.
   * @param {number} entry The entry number of the entry to remove.
   * @param {string} partOfSpeech The part of speech of the entry to remove.
   */
  public static async removeEntry(language: string, word: string, entry: number, partOfSpeech: string): Promise<void> {
    const favorites: FavoriteEntry[] = await this.getEntries();
    const updatedFavorites = favorites.filter(
      (fav: FavoriteEntry) =>
        fav.language.toLowerCase() !== language.toLowerCase() ||
        fav.word.toLowerCase() !== word.toLowerCase() ||
        fav.entry !== entry ||
        fav.partOfSpeech !== partOfSpeech,
    );
    LocalStorage.setItem(Favorite.key, JSON.stringify(updatedFavorites));
  }

  /**
   * Removes all favorite items from local storage.
   *
   * @returns {Promise<void>} A promise that resolves when all favorites have been removed.
   */
  public static async removeAll(): Promise<void> {
    await LocalStorage.removeItem(Favorite.key);
  }

  /**
   * Determines whether a given word in a specified language is marked as a favorite.
   *
   * @param {string} language The language of the word to check.
   * @param {string} word The word to check for favorite status.
   * @param {number} entry The entry number associated with the word.
   * @param {string} partOfSpeech The part of speech associated with the word.
   * @returns {boolean} Wether the word and language combination is a favorite.
   */
  public static async exist(language: string, word: string, entry: number, partOfSpeech: string): Promise<boolean> {
    const favorites: FavoriteEntry[] = await this.getEntries();
    return favorites.some(
      (fav: FavoriteEntry) =>
        fav.language === language && fav.word === word && fav.entry === entry && fav.partOfSpeech === partOfSpeech,
    );
  }
}

export default Favorite;
export type { FavoriteEntry };
