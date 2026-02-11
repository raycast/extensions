/**
 * Dataset de SIREN réels pour les tests d'intégration
 * Ces données permettent de valider le comportement avec de vraies réponses de l'API INPI
 */

export interface RealSirenTestCase {
  siren: string;
  type: "personneMorale" | "personnePhysique";
  expectedFields: string[];
  description: string;
  legalForm: string;
  expectedRepresentativeRole?: string;
}

export const REAL_SIREN_TEST_CASES: RealSirenTestCase[] = [
  {
    siren: "552032534",
    type: "personneMorale",
    description: "SA (Société Anonyme) - Grande entreprise cotée",
    legalForm: "SA",
    expectedFields: [
      "formality.content.personneMorale.denomination",
      "formality.content.personneMorale.composition.pouvoirs",
      "formality.content.personneMorale.adresseEntreprise",
      "formality.content.natureCreation.formeJuridique",
    ],
    expectedRepresentativeRole: "Président",
  },
  {
    siren: "391164217",
    type: "personneMorale",
    description: "SARL (Société à Responsabilité Limitée) - PME classique",
    legalForm: "SARL",
    expectedFields: [
      "formality.content.personneMorale.denomination",
      "formality.content.personneMorale.composition.pouvoirs",
      "formality.content.personneMorale.adresseEntreprise",
      "formality.content.natureCreation.formeJuridique",
    ],
    expectedRepresentativeRole: "Gérant",
  },
  {
    siren: "794598813",
    type: "personneMorale",
    description: "SAS (Société par Actions Simplifiée) - Startup/Tech",
    legalForm: "SAS",
    expectedFields: [
      "formality.content.personneMorale.denomination",
      "formality.content.personneMorale.composition.pouvoirs",
      "formality.content.personneMorale.adresseEntreprise",
      "formality.content.natureCreation.formeJuridique",
    ],
    expectedRepresentativeRole: "Président",
  },
  {
    siren: "949053854",
    type: "personnePhysique",
    description: "Auto-entrepreneur/Micro-entreprise",
    legalForm: "Entrepreneur individuel",
    expectedFields: [
      "formality.content.personnePhysique.identite.entrepreneur.descriptionPersonne.nom",
      "formality.content.personnePhysique.identite.entrepreneur.descriptionPersonne.prenoms",
      "formality.content.personnePhysique.adresseEntreprise",
    ],
  },
  {
    siren: "879574283",
    type: "personneMorale",
    description: "SCI (Société Civile Immobilière)",
    legalForm: "SCI",
    expectedFields: [
      "formality.content.personneMorale.denomination",
      "formality.content.personneMorale.composition.pouvoirs",
      "formality.content.personneMorale.adresseEntreprise",
      "formality.content.natureCreation.formeJuridique",
    ],
    expectedRepresentativeRole: "Gérant",
  },
  {
    siren: "492605712",
    type: "personneMorale",
    description: "EURL (Entreprise Unipersonnelle à Responsabilité Limitée)",
    legalForm: "EURL",
    expectedFields: [
      "formality.content.personneMorale.denomination",
      "formality.content.personneMorale.composition.pouvoirs",
      "formality.content.personneMorale.adresseEntreprise",
      "formality.content.natureCreation.formeJuridique",
    ],
    expectedRepresentativeRole: "Gérant",
  },
  {
    siren: "411331580",
    type: "personneMorale",
    description: "SASU (SAS Unipersonnelle)",
    legalForm: "SASU",
    expectedFields: [
      "formality.content.personneMorale.denomination",
      "formality.content.personneMorale.composition.pouvoirs",
      "formality.content.personneMorale.adresseEntreprise",
      "formality.content.natureCreation.formeJuridique",
    ],
    expectedRepresentativeRole: "Président",
  },
  {
    siren: "317236248",
    type: "personneMorale",
    description: "Association loi 1901",
    legalForm: "Association",
    expectedFields: [
      "formality.content.personneMorale.denomination",
      "formality.content.personneMorale.composition.pouvoirs",
      "formality.content.personneMorale.adresseEntreprise",
    ],
    expectedRepresentativeRole: "Président",
  },
  {
    siren: "421251067",
    type: "personneMorale",
    description: "SCOP (Société Coopérative de Production)",
    legalForm: "SCOP",
    expectedFields: [
      "formality.content.personneMorale.denomination",
      "formality.content.personneMorale.composition.pouvoirs",
      "formality.content.personneMorale.adresseEntreprise",
      "formality.content.natureCreation.formeJuridique",
    ],
    expectedRepresentativeRole: "Gérant",
  },
  {
    siren: "314685454",
    type: "personneMorale",
    description: "Holding/Société de participations",
    legalForm: "Holding",
    expectedFields: [
      "formality.content.personneMorale.denomination",
      "formality.content.personneMorale.composition.pouvoirs",
      "formality.content.personneMorale.adresseEntreprise",
      "formality.content.natureCreation.formeJuridique",
    ],
    expectedRepresentativeRole: "Président",
  },
];

/**
 * Fonction utilitaire pour accéder aux propriétés imbriquées
 */
export function getNestedProperty(obj: Record<string, unknown> | null | undefined, path: string): unknown {
  return path.split(".").reduce((current: unknown, key) => {
    if (current && typeof current === "object" && current !== null && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj as unknown);
}

/**
 * Validation des structures de données selon le type d'entité
 */
export function validateEntityStructure(data: Record<string, unknown>, testCase: RealSirenTestCase): boolean {
  const formality = data?.formality as Record<string, unknown> | undefined;
  const content = formality?.content as Record<string, unknown> | undefined;

  if (!formality || !content) return false;

  // Entity type verification
  const hasPersonneMorale = !!content.personneMorale;
  const hasPersonnePhysique = !!content.personnePhysique;

  if (testCase.type === "personneMorale" && !hasPersonneMorale) return false;
  if (testCase.type === "personnePhysique" && !hasPersonnePhysique) return false;

  // Expected fields verification
  return testCase.expectedFields.every((field) => {
    const value = getNestedProperty(data, field);
    return value !== undefined && value !== null;
  });
}
