import { CompanyData, RepresentativeInfo, PersonDescription } from "../types";
import {
  formatAddress,
  formatField,
  formatSiren,
  formatFrenchNumber,
  getGenderAgreement,
  getLegalFormLabel,
  getRoleName,
  FALLBACK_VALUES,
} from "./utils";
import { formatRepresentativeName, formatCityName } from "./formatting";
import { findGreffeByCodePostal } from "./greffe-lookup";

/**
 * Main function to build markdown based on company type.
 */
export function buildMarkdown(data: CompanyData): string {
  const content = data.formality.content;

  if (content.personnePhysique) {
    return buildPersonnePhysiqueMarkdown(data);
  }

  if (content.personneMorale) {
    return buildPersonneMoraleMarkdown(data);
  }

  return "No information to display.";
}

/**
 * Builds markdown for individual entrepreneurs (personnePhysique)
 */
export function buildPersonnePhysiqueMarkdown(data: CompanyData): string {
  const personnePhysique = data.formality.content.personnePhysique!;
  const desc = personnePhysique.identite?.entrepreneur?.descriptionPersonne;

  // Extract personal information
  const civilite = desc?.genre === "2" ? "Madame" : "Monsieur";
  const prenom = (desc?.prenoms || [])[0] || "";
  const nom = desc?.nom || "";
  const prenomNom = `${prenom} ${nom}`.trim();

  const ne = desc?.genre === "2" ? "Née" : "Né";
  const dateNaissance = formatField(desc?.dateDeNaissance, FALLBACK_VALUES.BIRTH_DATE);
  const lieuNaissance = formatField(desc?.lieuDeNaissance, FALLBACK_VALUES.BIRTH_PLACE);
  const nationalite = formatField(desc?.nationalite, FALLBACK_VALUES.NATIONALITY);

  // Extract address information
  const adresse = personnePhysique.adressePersonne
    ? formatAddress(personnePhysique.adressePersonne)
    : formatAddress(personnePhysique.adresseEntreprise);
  const demeurant = formatField(adresse, FALLBACK_VALUES.ADDRESS);

  const siren = formatSiren(data.formality.siren);

  return `${civilite} ${prenomNom}
${ne}(e) le ${dateNaissance} à ${lieuNaissance}
De nationalité ${nationalite}
Demeurant ${demeurant}
N° : ${siren}`;
}

/**
 * Builds markdown for corporate entities (personneMorale).
 */
export function buildPersonneMoraleMarkdown(data: CompanyData): string {
  const content = data.formality.content;
  const personneMorale = content.personneMorale!;
  const natureCreation = content.natureCreation;

  // Extract basic company information
  const legalForm = getLegalFormLabel(natureCreation.formeJuridique);
  const sirenFormatted = formatSiren(data.formality.siren);

  const identite = personneMorale.identite;
  const denomination = formatField(identite?.entreprise?.denomination) || formatField(personneMorale.denomination);
  const shareCapitalRaw =
    formatField(identite?.description?.montantCapital) || formatField(personneMorale.capital?.montant);
  const shareCapital =
    shareCapitalRaw !== FALLBACK_VALUES.MISSING_DATA ? formatFrenchNumber(shareCapitalRaw) : shareCapitalRaw;

  // Extract address and RCS information
  const address = formatAddress(personneMorale.adresseEntreprise);
  const codePostal = personneMorale.adresseEntreprise?.adresse?.codePostal;
  const greffeFromData = codePostal ? findGreffeByCodePostal(codePostal) : null;
  const rawRcsCity = greffeFromData || personneMorale.immatriculationRcs?.villeImmatriculation;
  const rcsCity = rawRcsCity ? formatCityName(rawRcsCity) : FALLBACK_VALUES.RCS_CITY;

  // Build company header and details
  const title = `**La société ${denomination}**`;
  const details = `${legalForm} au capital de ${shareCapital}\u00A0€
Immatriculée au RCS de ${rcsCity} sous le n° ${sirenFormatted}
Dont le siège social est situé ${address}`;

  // Extract representative information
  const representative = extractRepresentativeInfo(personneMorale.composition || {});

  let representativeLine: string;
  if (representative.isHolding) {
    // Simplified line for corporate representatives
    representativeLine = `Représentée aux fins des présentes par ${representative.name} en tant que ${representative.role}.`;
  } else {
    // Standard individual representative
    const genderAgreement = getGenderAgreement(representative.gender);
    representativeLine = `Représentée aux fins des présentes par ${representative.name} en sa qualité de ${representative.role}, dûment ${genderAgreement}.`;
  }

  return `
${title}

${details}

${representativeLine}
  `;
}

/**
 * Extracts the most relevant representative information from the composition data.
 * Returns the highest-priority representative based on role hierarchy.
 */
export function extractRepresentativeInfo(composition: Record<string, unknown>): RepresentativeInfo {
  const fallback = {
    name: FALLBACK_VALUES.REPRESENTATIVE_NAME,
    role: FALLBACK_VALUES.REPRESENTATIVE_ROLE,
    gender: null,
    isHolding: false,
  };

  const pouvoirs = (composition?.pouvoirs as Record<string, unknown>[]) || [];
  if (!Array.isArray(pouvoirs) || pouvoirs.length === 0) return fallback;

  // Define role priority (highest to lowest priority)
  const rolePriority = ["5132", "5131", "5141"]; // President, Manager, General Director

  // Sort representatives by role priority
  const sortedPouvoirs = pouvoirs.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
    const roleA = a.roleEntreprise as string;
    const roleB = b.roleEntreprise as string;
    const priorityA = rolePriority.indexOf(roleA);
    const priorityB = rolePriority.indexOf(roleB);

    // Higher priority (lower index) comes first, unknown roles go to end
    if (priorityA === -1 && priorityB === -1) return 0;
    if (priorityA === -1) return 1;
    if (priorityB === -1) return -1;
    return priorityA - priorityB;
  });

  const pouvoir = sortedPouvoirs[0];

  // Handle individual representative (person) - NEW API FORMAT
  const individu = pouvoir.individu as { descriptionPersonne?: PersonDescription };
  if (individu?.descriptionPersonne) {
    const desc = individu.descriptionPersonne;
    const name = formatRepresentativeName(desc.prenoms || [], desc.nom || "");
    const roleCode = pouvoir.roleEntreprise as string;
    const role = getRoleName(roleCode || "");
    // Genre may not be present in new format, default to null
    const gender = desc.genre === "2" ? "F" : desc.genre === "1" ? "M" : null;

    return { name, role, gender };
  }

  // Handle individual representative (person) - OLD API FORMAT (fallback)
  const personnePhysique = pouvoir.personnePhysique as { identite?: { descriptionPersonne?: PersonDescription } };
  if (personnePhysique?.identite?.descriptionPersonne) {
    const desc = personnePhysique.identite.descriptionPersonne;
    const name = formatRepresentativeName(desc.prenoms || [], desc.nom || "");
    const roleCode = pouvoir.roleEntreprise as string;
    const role = getRoleName(roleCode || "");
    const gender = desc.genre === "2" ? "F" : "M";

    return { name, role, gender };
  }

  // Handle corporate representative (company)
  const entreprise = pouvoir.entreprise as { denomination?: string };
  if (entreprise?.denomination) {
    const name = entreprise.denomination || FALLBACK_VALUES.REPRESENTATIVE_NAME;
    const roleCode = pouvoir.roleEntreprise as string;
    const role = getRoleName(roleCode || "");

    return { name, role, gender: null, isHolding: true };
  }

  return fallback;
}

/**
 * Converts markdown to HTML for rich text copying to applications like Word
 */
export function markdownToHtml(markdown: string): string {
  return (
    markdown
      // Convert bold markdown (**text**) to HTML
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      // Convert italic markdown (*text*) to HTML
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      // Split into lines and wrap each in paragraph tags
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => `<p>${line.trim()}</p>`)
      .join("")
  );
}

/**
 * Converts markdown to plain text (fallback for applications that don't support HTML)
 */
export function markdownToPlainText(markdown: string): string {
  return (
    markdown
      // Remove bold markdown (**text**)
      .replace(/\*\*(.*?)\*\*/g, "$1")
      // Remove italic markdown (*text*)
      .replace(/\*(.*?)\*/g, "$1")
      .trim()
  );
}
