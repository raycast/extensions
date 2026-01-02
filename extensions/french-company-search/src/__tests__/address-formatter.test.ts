/**
 * Tests pour le service de formatage d'adresses français
 */

import { expandStreetType, formatAddress, isValidAddressType, getAddressTypeMappings } from "../lib/address-formatter";

describe("Address Formatter Service", () => {
  describe("expandStreetType", () => {
    test("should expand common abbreviations", () => {
      expect(expandStreetType("BD")).toBe("Boulevard");
      expect(expandStreetType("AV")).toBe("Avenue");
      expect(expandStreetType("RUE")).toBe("Rue");
      expect(expandStreetType("PL")).toBe("Place");
      expect(expandStreetType("CHE")).toBe("Chemin");
      expect(expandStreetType("IMP")).toBe("Impasse");
    });

    test("should handle case variations", () => {
      expect(expandStreetType("bd")).toBe("Boulevard");
      expect(expandStreetType("Bd")).toBe("Boulevard");
      expect(expandStreetType("BD")).toBe("Boulevard");
      expect(expandStreetType(" bd ")).toBe("Boulevard");
    });

    test("should handle unknown abbreviations gracefully", () => {
      expect(expandStreetType("UNKNOWN")).toBe("Unknown");
      expect(expandStreetType("")).toBe("");
      expect(expandStreetType("XYZ")).toBe("Xyz");
    });

    test("should handle null/undefined inputs", () => {
      expect(expandStreetType(null as unknown as string)).toBe("");
      expect(expandStreetType(undefined as unknown as string)).toBe("");
    });

    test("should handle complex abbreviations", () => {
      expect(expandStreetType("GR")).toBe("Grande Rue");
      expect(expandStreetType("RPT")).toBe("Rond-point");
      expect(expandStreetType("STDE")).toBe("Stade");
    });
  });

  describe("formatAddress", () => {
    test("should format complete address with expansion", () => {
      const address = {
        numeroVoie: "123",
        typeVoie: "BD",
        libelleVoie: "VICTOR HUGO",
        codePostal: "75001",
        commune: "PARIS",
      };

      const result = formatAddress(address);
      expect(result).toBe("123 boulevard Victor Hugo, 75001 Paris");
    });

    test("should format avenue address", () => {
      const address = {
        numeroVoie: "45",
        typeVoie: "AV",
        libelleVoie: "DES CHAMPS ELYSEES",
        codePostal: "75008",
        commune: "PARIS",
      };

      const result = formatAddress(address);
      expect(result).toBe("45 avenue des Champs Elysees, 75008 Paris");
    });

    test("should handle missing street number", () => {
      const address = {
        typeVoie: "RUE",
        libelleVoie: "DE LA PAIX",
        codePostal: "75001",
        commune: "PARIS",
      };

      const result = formatAddress(address);
      expect(result).toBe("rue de la Paix, 75001 Paris");
    });

    test("should handle missing postal code", () => {
      const address = {
        numeroVoie: "10",
        typeVoie: "PL",
        libelleVoie: "VENDOME",
        commune: "PARIS",
      };

      const result = formatAddress(address);
      expect(result).toBe("10 place Vendome, Paris");
    });

    test("should handle empty address", () => {
      expect(formatAddress({})).toBe("");
      expect(
        formatAddress(
          null as unknown as {
            numeroVoie?: string;
            typeVoie?: string;
            libelleVoie?: string;
            codePostal?: string;
            commune?: string;
          },
        ),
      ).toBe("");
    });

    test("should handle unknown street type", () => {
      const address = {
        numeroVoie: "5",
        typeVoie: "UNKNOWN",
        libelleVoie: "TEST STREET",
        codePostal: "75001",
        commune: "PARIS",
      };

      const result = formatAddress(address);
      expect(result).toBe("5 unknown Test Street, 75001 Paris");
    });

    test("should handle French prepositions correctly", () => {
      const address = {
        numeroVoie: "8",
        typeVoie: "RUE",
        libelleVoie: "DU GENERAL DE GAULLE",
        codePostal: "69001",
        commune: "LYON",
      };

      const result = formatAddress(address);
      expect(result).toBe("8 rue du General de Gaulle, 69001 Lyon");
    });
  });

  describe("isValidAddressType", () => {
    test("should validate known abbreviations", () => {
      expect(isValidAddressType("BD")).toBe(true);
      expect(isValidAddressType("AV")).toBe(true);
      expect(isValidAddressType("RUE")).toBe(true);
      expect(isValidAddressType("bd")).toBe(true); // case insensitive
    });

    test("should reject unknown abbreviations", () => {
      expect(isValidAddressType("UNKNOWN")).toBe(false);
      expect(isValidAddressType("")).toBe(false);
      expect(isValidAddressType(null as unknown as string)).toBe(false);
    });
  });

  describe("getAddressTypeMappings", () => {
    test("should return complete mappings object", () => {
      const mappings = getAddressTypeMappings();

      expect(mappings).toBeDefined();
      expect(typeof mappings).toBe("object");
      expect(mappings["BD"]).toBe("BOULEVARD");
      expect(mappings["AV"]).toBe("AVENUE");
      expect(mappings["RUE"]).toBe("RUE");

      // Should have reasonable number of mappings
      expect(Object.keys(mappings).length).toBeGreaterThan(200);
    });
  });

  describe("Real-world address scenarios", () => {
    test("should format typical business addresses", () => {
      const addresses = [
        {
          input: { numeroVoie: "1", typeVoie: "BD", libelleVoie: "HAUSSMANN", codePostal: "75009", commune: "PARIS" },
          expected: "1 boulevard Haussmann, 75009 Paris",
        },
        {
          input: {
            numeroVoie: "42",
            typeVoie: "AV",
            libelleVoie: "VICTOR HUGO",
            codePostal: "75116",
            commune: "PARIS",
          },
          expected: "42 avenue Victor Hugo, 75116 Paris",
        },
        {
          input: { numeroVoie: "15", typeVoie: "PL", libelleVoie: "BELLECOUR", codePostal: "69002", commune: "LYON" },
          expected: "15 place Bellecour, 69002 Lyon",
        },
        {
          input: { typeVoie: "CHE", libelleVoie: "DES OLIVIERS", codePostal: "13001", commune: "MARSEILLE" },
          expected: "chemin des Oliviers, 13001 Marseille",
        },
      ];

      addresses.forEach(({ input, expected }) => {
        expect(formatAddress(input)).toBe(expected);
      });
    });

    test("should preserve French capitalization rules", () => {
      const address = {
        numeroVoie: "3",
        typeVoie: "RUE",
        libelleVoie: "DE LA REPUBLIQUE",
        codePostal: "13001",
        commune: "MARSEILLE",
      };

      const result = formatAddress(address);
      expect(result).toBe("3 rue de la Republique, 13001 Marseille");
    });
  });
});
