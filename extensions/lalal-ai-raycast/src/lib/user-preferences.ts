import { LocalStorage } from "@raycast/api";

export class UserPreferences {
  private readonly LAST_STEM_TYPE_KEY = "lalal-ai-last-stem-type";
  private readonly DEFAULT_STEM_TYPE = "vocals"; // Lalal.ai's default order

  async getLastUsedStemType(): Promise<string> {
    try {
      const lastUsed = await LocalStorage.getItem<string>(
        this.LAST_STEM_TYPE_KEY,
      );
      return lastUsed || this.DEFAULT_STEM_TYPE;
    } catch (error) {
      console.error("Failed to get last used stem type:", error);
      return this.DEFAULT_STEM_TYPE;
    }
  }

  async setLastUsedStemType(stemType: string): Promise<void> {
    try {
      await LocalStorage.setItem(this.LAST_STEM_TYPE_KEY, stemType);
    } catch (error) {
      console.error("Failed to save last used stem type:", error);
    }
  }
}
