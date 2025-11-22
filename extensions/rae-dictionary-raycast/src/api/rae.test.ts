import { jest } from "@jest/globals";
import { searchWord, getDailyWord, getRandomWord, ApiError } from "./rae";

// Set longer timeout for API calls
jest.setTimeout(10000);

// Tests are skipped to avoid hitting the real API during CI/CD
describe("RAE API", () => {
  // Real API tests using snapshots
  describe("searchWord", () => {
    it("should fetch and return a known word", async () => {
      // Test with a common word that's unlikely to change in the dictionary
      const result = await searchWord("hola");

      // Basic structure validation
      expect(result.word).toBe("hola");
      expect(result.meanings.length).toBeGreaterThan(0);
      expect(result.meanings[0].senses.length).toBeGreaterThan(0);

      expect(result).toMatchSnapshot({});
    });

    it("should throw error for non-existent words", async () => {
      // Using a gibberish word that shouldn't exist in the dictionary
      await expect(searchWord("xyzxyzxyznotaword")).rejects.toThrow("Word not found");
    });

    it("should return suggestions for misspelled words", async () => {
      try {
        await searchWord("rosis");
        // Si llegamos aquí, la palabra se encontró cuando no debería
        expect(true).toBe(false);
      } catch (e) {
        if (e instanceof ApiError && e.suggestions && e.suggestions.length > 0) {
          expect(e.suggestions).toContain("rosa");
        } else {
          throw new Error("Expected ApiError with suggestions");
        }
      }
    });
  });

  describe("getDailyWord", () => {
    it("should fetch today's word and return its data", async () => {
      const result = await getDailyWord();

      // Basic structure validation
      expect(result.word).toBeTruthy();
      expect(result.meanings.length).toBeGreaterThan(0);

      // Create snapshot of the structure but not the specific word (which changes daily)
      expect(result).toMatchSnapshot({
        word: expect.any(String),
        meanings: expect.any(Array),
      });
    });
  });

  describe("getRandomWord", () => {
    it("should fetch a random word with specified length constraints", async () => {
      const result = await getRandomWord(4, 6);

      // Validate the length constraint
      expect(result.word.length).toBeGreaterThanOrEqual(4);
      expect(result.word.length).toBeLessThanOrEqual(6);

      // Basic structure validation
      expect(result.meanings.length).toBeGreaterThan(0);

      // Create snapshot of the structure but not the specific word (which is random)
      expect(result).toMatchSnapshot({
        word: expect.any(String),
        meanings: expect.any(Array),
      });
    });

    it("should fetch a random word without length constraints", async () => {
      const result = await getRandomWord();

      // Basic structure validation
      expect(result.word).toBeTruthy();
      expect(result.meanings.length).toBeGreaterThan(0);

      // Create snapshot of the structure but not the specific word (which is random)
      expect(result).toMatchSnapshot({
        word: expect.any(String),
        meanings: expect.any(Array),
      });
    });
  });
});
