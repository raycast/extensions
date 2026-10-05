/**
 * Tests d'intégration pour le formatage d'adresses avec des données réelles
 */

import { describe, expect } from "@jest/globals";
import { formatAddress } from "../../lib/utils";
import { expandStreetType } from "../../lib/address-formatter";
import { AddressInfo } from "../../types";

describe("Address Formatting Integration Tests", () => {
  describe("Real-world address scenarios", () => {
    test("should format typical French business addresses correctly", () => {
      const testCases = [
        {
          input: {
            adresse: {
              numeroVoie: "1",
              typeVoie: "BD",
              libelleVoie: "HAUSSMANN",
              codePostal: "75009",
              commune: "PARIS",
            },
          },
          expected: "1 boulevard Haussmann, 75009 Paris",
          description: "Boulevard Haussmann Paris",
        },
        {
          input: {
            adresse: {
              numeroVoie: "42",
              typeVoie: "AV",
              libelleVoie: "VICTOR HUGO",
              codePostal: "75116",
              commune: "PARIS",
            },
          },
          expected: "42 avenue Victor Hugo, 75116 Paris",
          description: "Avenue Victor Hugo Paris",
        },
        {
          input: {
            adresse: {
              numeroVoie: "15",
              typeVoie: "PL",
              libelleVoie: "BELLECOUR",
              codePostal: "69002",
              commune: "LYON",
            },
          },
          expected: "15 place Bellecour, 69002 Lyon",
          description: "Place Bellecour Lyon",
        },
        {
          input: {
            adresse: {
              typeVoie: "CHE",
              libelleVoie: "DES OLIVIERS",
              codePostal: "13001",
              commune: "MARSEILLE",
            },
          },
          expected: "chemin des Oliviers, 13001 Marseille",
          description: "Chemin des Oliviers Marseille",
        },
        {
          input: {
            adresse: {
              numeroVoie: "3",
              typeVoie: "RUE",
              libelleVoie: "DE LA REPUBLIQUE",
              codePostal: "13001",
              commune: "MARSEILLE",
            },
          },
          expected: "3 rue de la Republique, 13001 Marseille",
          description: "Rue de la République Marseille",
        },
        {
          input: {
            adresse: {
              numeroVoie: "8",
              typeVoie: "IMP",
              libelleVoie: "DU GENERAL DE GAULLE",
              codePostal: "69001",
              commune: "LYON",
            },
          },
          expected: "8 impasse du General de Gaulle, 69001 Lyon",
          description: "Impasse du Général de Gaulle Lyon",
        },
      ];

      testCases.forEach(({ input, expected, description }) => {
        const result = formatAddress(input as AddressInfo);
        expect(result).toBe(expected);
        console.log(`✓ ${description}: ${result}`);
      });
    });

    test("should handle complex INPI data structures", () => {
      // Simulate real INPI address data structure
      const complexAddress: AddressInfo = {
        adresse: {
          complementLocalisation: "BATIMENT A",
          numeroVoie: "123",
          indiceRepetition: "BIS",
          typeVoie: "BD",
          libelleVoie: "DE LA LIBERTE",
          codePostal: "75001",
          commune: "PARIS",
        },
      };

      const result = formatAddress(complexAddress);
      expect(result).toBe("BATIMENT A 123 BIS boulevard de la Liberte, 75001 Paris");
    });

    test("should gracefully handle incomplete addresses", () => {
      const partialAddress: AddressInfo = {
        adresse: {
          typeVoie: "AV",
          libelleVoie: "INCOMPLETE",
          commune: "PARIS",
        },
      };

      const result = formatAddress(partialAddress);
      expect(result).toBe("avenue Incomplete, [[to be completed]] Paris");
    });
  });

  describe("Street type expansion validation", () => {
    test("should expand all major French street types", () => {
      const streetTypes = [
        { abbrev: "BD", expected: "Boulevard" },
        { abbrev: "AV", expected: "Avenue" },
        { abbrev: "RUE", expected: "Rue" },
        { abbrev: "PL", expected: "Place" },
        { abbrev: "CHE", expected: "Chemin" },
        { abbrev: "IMP", expected: "Impasse" },
        { abbrev: "ALL", expected: "Allee" },
        { abbrev: "CRS", expected: "Cours" },
        { abbrev: "FG", expected: "Faubourg" },
        { abbrev: "QUAI", expected: "Quai" },
        { abbrev: "RPT", expected: "Rond-point" },
        { abbrev: "SQ", expected: "Square" },
      ];

      streetTypes.forEach(({ abbrev, expected }) => {
        const result = expandStreetType(abbrev);
        expect(result).toBe(expected);
      });
    });

    test("should handle case variations consistently", () => {
      const variations = ["bd", "BD", "Bd", " bd ", "  BD  "];

      variations.forEach((variation) => {
        const result = expandStreetType(variation);
        expect(result).toBe("Boulevard");
      });
    });
  });

  describe("French capitalization rules", () => {
    test("should correctly handle French articles and prepositions", () => {
      const testAddress: AddressInfo = {
        adresse: {
          numeroVoie: "10",
          typeVoie: "RUE",
          libelleVoie: "DU FOUR ET DE LA PAIX",
          codePostal: "75001",
          commune: "PARIS",
        },
      };

      const result = formatAddress(testAddress);
      expect(result).toBe("10 rue du Four et de la Paix, 75001 Paris");

      // Verify that articles stay lowercase
      expect(result).toContain("du");
      expect(result).toContain("et");
      expect(result).toContain("de");
      expect(result).toContain("la");

      // Verify that main words are capitalized
      expect(result).toContain("Four");
      expect(result).toContain("Paix");
    });
  });

  describe("Performance with address formatting", () => {
    test("should format addresses efficiently", () => {
      const startTime = Date.now();

      // Test with 100 address formatting operations
      for (let i = 0; i < 100; i++) {
        const testAddress: AddressInfo = {
          adresse: {
            numeroVoie: String(i + 1),
            typeVoie: "BD",
            libelleVoie: `TEST STREET ${i}`,
            codePostal: "75001",
            commune: "PARIS",
          },
        };

        formatAddress(testAddress);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete 100 operations in under 50ms
      expect(duration).toBeLessThan(50);
      console.log(`✓ Formatted 100 addresses in ${duration}ms`);
    });
  });
});
