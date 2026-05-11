import { describe, it, expect } from "@jest/globals";
import {
  buildMarkdown,
  buildPersonneMoraleMarkdown,
  buildPersonnePhysiqueMarkdown,
  extractRepresentativeInfo,
  markdownToHtml,
  markdownToPlainText,
} from "../lib/markdown-builder";
import { CompanyData } from "../types";

describe("markdown-builder", () => {
  describe("buildPersonneMoraleMarkdown", () => {
    it("should format corporate entity with complete data", () => {
      const mockData: CompanyData = {
        id: "test-id-123",
        formality: {
          siren: "123456789",
          content: {
            succursaleOuFiliale: "AVEC_ETABLISSEMENT",
            formeExerciceActivitePrincipale: "COMMERCIALE",
            personneMorale: {
              denomination: "Test Company SARL",
              identite: {
                entreprise: {
                  denomination: "Test Company SARL",
                },
                description: {
                  montantCapital: 10000,
                },
              },
              adresseEntreprise: {
                adresse: {
                  codePostal: "75001",
                  numeroVoie: "123",
                  typeVoie: "rue",
                  libelleVoie: "de la Paix",
                  commune: "Paris",
                },
              },
              immatriculationRcs: {
                villeImmatriculation: "PARIS",
                numeroRcs: "123456789",
              },
              composition: {
                pouvoirs: [
                  {
                    individu: {
                      descriptionPersonne: {
                        nom: "Dupont",
                        prenoms: ["Jean"],
                        genre: "1",
                      },
                    },
                    roleEntreprise: "5132",
                  },
                ],
              },
            },
            natureCreation: {
              dateCreation: "2020-01-01",
              societeEtrangere: false,
              formeJuridique: "5499",
              formeJuridiqueInsee: "5499",
              etablieEnFrance: true,
              salarieEnFrance: false,
              relieeEntrepriseAgricole: false,
              entrepriseAgricole: false,
            },
          },
        },
        updatedAt: "2023-01-01",
        nombreEtablissementsOuverts: 1,
        nombreRepresentantsActifs: 1,
      };

      const result = buildPersonneMoraleMarkdown(mockData);

      expect(result).toContain("**La société Test Company SARL**");
      expect(result).toContain("Société à responsabilité limitée (SARL) au capital de 10\u00A0000,00\u00A0€");
      expect(result).toContain("123\u00A0456\u00A0789");
      expect(result).toContain("Jean DUPONT");
    });
  });

  describe("buildPersonnePhysiqueMarkdown", () => {
    it("should format individual entrepreneur with complete data", () => {
      const mockData: CompanyData = {
        id: "test-id-456",
        updatedAt: "2025-08-12T12:00:00+02:00",
        nombreRepresentantsActifs: 1,
        nombreEtablissementsOuverts: 1,
        formality: {
          siren: "987654321",
          content: {
            succursaleOuFiliale: "SANS_ETABLISSEMENT",
            formeExerciceActivitePrincipale: "COMMERCIALE",
            personnePhysique: {
              identite: {
                entrepreneur: {
                  descriptionPersonne: {
                    nom: "Martin",
                    prenoms: ["Marie"],
                    genre: "2",
                    dateDeNaissance: "1980-01-15",
                    lieuDeNaissance: "Lyon",
                    nationalite: "Française",
                  },
                },
              },
              adresseEntreprise: {
                adresse: {
                  numeroVoie: "45",
                  typeVoie: "avenue",
                  libelleVoie: "Victor Hugo",
                  codePostal: "69001",
                  commune: "Lyon",
                },
              },
            },
            natureCreation: {
              etablieEnFrance: true,
            },
          },
        },
      } as CompanyData;

      const result = buildPersonnePhysiqueMarkdown(mockData);

      expect(result).toContain("Madame Marie Martin");
      expect(result).toContain("Née(e) le 1980-01-15");
      expect(result).toContain("De nationalité Française");
      expect(result).toContain("987\u00A0654\u00A0321");
    });
  });

  describe("extractRepresentativeInfo", () => {
    it("should extract representative with role priority", () => {
      const composition = {
        pouvoirs: [
          {
            personnePhysique: {
              identite: {
                descriptionPersonne: {
                  nom: "Directeur",
                  prenoms: ["Jean"],
                  genre: "1",
                },
              },
            },
            roleEntreprise: "5141", // General Director
          },
          {
            personnePhysique: {
              identite: {
                descriptionPersonne: {
                  nom: "President",
                  prenoms: ["Paul"],
                  genre: "1",
                },
              },
            },
            roleEntreprise: "5132", // President (higher priority)
          },
        ],
      };

      const result = extractRepresentativeInfo(composition);

      expect(result.name).toContain("Paul PRESIDENT");
      expect(result.role).toBe("Président");
      expect(result.gender).toBe("M");
    });

    it("should handle corporate representative", () => {
      const composition = {
        pouvoirs: [
          {
            entreprise: {
              denomination: "Holding Company",
            },
            roleEntreprise: "5131",
          },
        ],
      };

      const result = extractRepresentativeInfo(composition);

      expect(result.name).toBe("Holding Company");
      expect(result.isHolding).toBe(true);
      expect(result.gender).toBe(null);
    });
  });

  describe("markdownToHtml", () => {
    it("should convert markdown formatting to HTML", () => {
      const markdown = "**Bold text** and *italic text*\nSecond line";
      const result = markdownToHtml(markdown);

      expect(result).toContain("<strong>Bold text</strong>");
      expect(result).toContain("<em>italic text</em>");
      expect(result).toContain("<p>");
    });
  });

  describe("markdownToPlainText", () => {
    it("should remove markdown formatting", () => {
      const markdown = "**Bold text** and *italic text*";
      const result = markdownToPlainText(markdown);

      expect(result).toBe("Bold text and italic text");
      expect(result).not.toContain("**");
      expect(result).not.toContain("*");
    });
  });

  describe("buildMarkdown", () => {
    it("should delegate to personnePhysique builder", () => {
      const mockData = {
        formality: {
          content: {
            personnePhysique: {
              /* minimal data */
            },
          },
        },
      } as CompanyData;

      const result = buildMarkdown(mockData);

      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should delegate to personneMorale builder", () => {
      const mockData = {
        formality: {
          content: {
            personneMorale: {
              /* minimal data */
            },
            natureCreation: {
              formeJuridique: "5599",
            },
          },
        },
      } as CompanyData;

      const result = buildMarkdown(mockData);

      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should return fallback message for empty data", () => {
      const mockData = {
        formality: {
          content: {},
        },
      } as CompanyData;

      const result = buildMarkdown(mockData);

      expect(result).toBe("No information to display.");
    });
  });
});
