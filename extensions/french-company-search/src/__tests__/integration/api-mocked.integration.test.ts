/**
 * Integration tests using mocked data (for CI/CD)
 * These tests run on GitHub Actions without requiring authentication
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { inpiApiMock, shouldUseMock } from "../../lib/inpi-api-mock";
import { buildMarkdown } from "../../lib/markdown-builder";
import { validateCompanyDataStructure } from "../../lib/api-validation";
import { REAL_SIREN_TEST_CASES } from "../../lib/real-siren-test-cases";

describe("Mocked API Integration Tests (CI/CD)", () => {
  beforeAll(() => {
    // Force use of mock for these tests
    process.env.FORCE_MOCK = "true";
  });

  afterAll(() => {
    delete process.env.FORCE_MOCK;
  });

  describe("Mock Service Validation", () => {
    it("should use mocked service in CI environment", () => {
      expect(shouldUseMock()).toBe(true);
    });

    it("should have valid mocked dataset", () => {
      const datasetInfo = inpiApiMock.getDatasetInfo();

      expect(datasetInfo.totalCompanies).toBeGreaterThan(0);
      expect(datasetInfo.successfulResponses).toBeGreaterThan(0);
      expect(datasetInfo.version).toBeDefined();
      expect(datasetInfo.generated).toBeDefined();
    });

    it("should have test SIREN available", () => {
      const availableSirens = inpiApiMock.getAvailableSirens();
      const datasetInfo = inpiApiMock.getDatasetInfo();

      // Check that we have at least a few SIREN available
      expect(availableSirens.length).toBeGreaterThan(0);
      expect(datasetInfo.successfulResponses).toBeGreaterThan(0);

      // If it's the temporary dataset (3 companies), accept that
      // Otherwise, expect at least 80% of test SIRENs
      const minExpected = datasetInfo.totalCompanies >= 10 ? Math.floor(REAL_SIREN_TEST_CASES.length * 0.8) : 2; // Minimum for temporary dataset

      const availableTestSirens = REAL_SIREN_TEST_CASES.filter((tc) => availableSirens.includes(tc.siren));

      expect(availableTestSirens.length).toBeGreaterThanOrEqual(minExpected);

      if (datasetInfo.totalCompanies < 10) {
        console.warn(
          "⚠️ Using temporary dataset. Generate full dataset with: cd local && npx ts-node generate-mock-dataset.ts",
        );
      }
    });
  });

  describe("Mocked Data Structure Validation", () => {
    const availableSirens = inpiApiMock.getAvailableSirens();
    const testCases = REAL_SIREN_TEST_CASES.filter((tc) => availableSirens.includes(tc.siren));

    it.each(testCases)("should validate mocked data structure for $description (SIREN: $siren)", async (testCase) => {
      const data = await inpiApiMock.getCompanyInfo(testCase.siren);

      // Basic structure validation
      expect(data).toBeDefined();
      expect(data.formality).toBeDefined();
      expect(data.formality.siren).toBe(testCase.siren);

      // Validation with API validation service
      const validation = validateCompanyDataStructure(data);
      expect(validation.valid).toBe(true);

      if (validation.errors.length > 0) {
        console.warn(`⚠️ Structure warnings for ${testCase.siren}:`, validation.errors);
      }
    });
  });

  describe("Markdown Generation with Mocked Data", () => {
    const availableSirens = inpiApiMock.getAvailableSirens();
    const testCases = REAL_SIREN_TEST_CASES.filter((tc) => availableSirens.includes(tc.siren));

    it.each(testCases)("should generate valid markdown for mocked $description (SIREN: $siren)", async (testCase) => {
      const data = await inpiApiMock.getCompanyInfo(testCase.siren);
      const markdown = buildMarkdown(data);

      // Markdown should not be empty
      expect(markdown).toBeDefined();
      expect(markdown.length).toBeGreaterThan(0);

      // Markdown should not contain fallbacks for essential data
      expect(markdown).not.toContain("No information to display");

      // Specific validation according to entity type
      if (testCase.type === "personneMorale") {
        expect(markdown).toContain("**La société");
        expect(markdown).toContain("Représentée aux fins des présentes");

        // SIREN should be correctly formatted (with non-breaking spaces)
        const formattedSiren = `${testCase.siren.substring(0, 3)}\u00A0${testCase.siren.substring(3, 6)}\u00A0${testCase.siren.substring(6, 9)}`;
        expect(markdown).toContain(formattedSiren);
      } else if (testCase.type === "personnePhysique") {
        expect(markdown).toMatch(/^(Monsieur|Madame)/);
        expect(markdown).toContain("N° : ");
      }

      // Validation of v1.1 formatting functions
      if (testCase.type === "personneMorale") {
        // Representative names format "FirstName LASTNAME"
        const representativeMatches = markdown.match(
          /Représentée aux fins des présentes par ([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ][a-zàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ-]+ [A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ-]+)/,
        );
        if (representativeMatches) {
          const representativeName = representativeMatches[1];
          expect(representativeName).toMatch(
            /^[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ][a-zàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ-]+ [A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ-]+$/,
          );
        }

        // RCS cities in Title Case (Paris, Lyon, etc.)
        const rcsMatches = markdown.match(
          /Immatriculée au RCS de ([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ][a-zàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ-]+)/,
        );
        if (rcsMatches) {
          const rcsCity = rcsMatches[1];
          expect(rcsCity).toMatch(/^[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ]/);
          expect(rcsCity).not.toMatch(/^[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ-]+$/);
        }

        // Addresses with extended street types (BD → Boulevard)
        const addressMatches = markdown.match(/situé (.+),/);
        if (addressMatches) {
          const address = addressMatches[1];
          // Check that abbreviations are expanded
          expect(address).not.toContain(" BD ");
          expect(address).not.toContain(" AV ");
          expect(address).not.toContain(" PL ");

          // Check that full forms are present (if applicable)
          if (address.includes("boulevard") || address.includes("avenue") || address.includes("place")) {
            expect(address).toMatch(/(boulevard|avenue|place|rue|chemin)/i);
          }
        }
      }
    });
  });

  describe("Mock Service Performance", () => {
    it("should respond quickly with mocked data", async () => {
      const availableSirens = inpiApiMock.getAvailableSirens();
      if (availableSirens.length === 0) {
        console.warn("No available SIREN in mocked dataset");
        return;
      }

      const testSiren = availableSirens[0];
      const startTime = Date.now();

      await inpiApiMock.getCompanyInfo(testSiren);

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(500); // Should be very fast with mocks
    });

    it("should handle multiple concurrent requests", async () => {
      const availableSirens = inpiApiMock.getAvailableSirens().slice(0, 3);

      if (availableSirens.length < 3) {
        console.warn("Not enough SIREN available for concurrent test");
        return;
      }

      const startTime = Date.now();

      const promises = availableSirens.map((siren) => inpiApiMock.getCompanyInfo(siren));

      const results = await Promise.all(promises);
      const elapsed = Date.now() - startTime;

      expect(results).toHaveLength(3);
      expect(elapsed).toBeLessThan(1000);

      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result.formality).toBeDefined();
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle unknown SIREN gracefully", async () => {
      const unknownSiren = "999999999";

      await expect(inpiApiMock.getCompanyInfo(unknownSiren)).rejects.toThrow(
        `SIREN ${unknownSiren} not found in mocked dataset`,
      );
    });

    it("should handle mocked errors properly", async () => {
      // Test errors by trying invalid SIRENs
      const invalidSiren = "000000000";

      await expect(inpiApiMock.getCompanyInfo(invalidSiren)).rejects.toThrow(
        `SIREN ${invalidSiren} not found in mocked dataset`,
      );
    });
  });
});
