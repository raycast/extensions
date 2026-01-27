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
import { findPhysicalRepresentative, extractSirenFromEnterprise } from "./recursive-representative-search";

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
 * Async version of buildMarkdown that supports recursive representative search.
 */
export async function buildMarkdownAsync(data: CompanyData): Promise<string> {
  const content = data.formality.content;

  if (content.personnePhysique) {
    return buildPersonnePhysiqueMarkdown(data);
  }

  if (content.personneMorale) {
    return await buildPersonneMoraleMarkdownAsync(data);
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
 * Builds markdown for corporate entities (personneMorale) - synchronous version.
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

  // Extract representative information (synchronous, no recursive search)
  const representative = extractRepresentativeInfo(personneMorale.composition || {});

  let representativeLine: string;
  if (representative.isHolding) {
    // Corporate representative without recursive search
    representativeLine = `Représentée aux fins des présentes par ${representative.name} en tant que ${representative.role}.`;
  } else {
    // Standard individual representative
    const genderAgreement = getGenderAgreement(representative.gender);
    representativeLine = `Représentée aux fins des présentes par ${representative.name} en sa qualité de ${representative.role}, dûment ${genderAgreement}.`;
  }

  return `${title}

${details}

${representativeLine}`;
}

/**
 * Builds markdown for corporate entities (personneMorale) - async version with recursive search.
 */
export async function buildPersonneMoraleMarkdownAsync(data: CompanyData): Promise<string> {
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

  // Extract representative information with recursive search for holding companies
  let representative = extractRepresentativeInfo(personneMorale.composition || {});

  // If representative is a holding company, try to find its physical representative
  if (representative.isHolding && representative.corporateSiren) {
    console.log(
      `🔍 Attempting recursive search for holding ${representative.name} (SIREN: ${representative.corporateSiren})`,
    );
    try {
      representative = await findPhysicalRepresentative(
        representative.name,
        representative.corporateSiren,
        representative.role,
      );
    } catch (error) {
      console.error(`❌ Failed to find physical representative for ${representative.name}:`, error);
    }
  }

  let representativeLine: string;
  if (representative.isHolding && representative.holdingRepresentative) {
    // Corporate representative with identified physical person - formatted as requested
    const physicalRep = representative.holdingRepresentative;
    const genderAgreement = getGenderAgreement(physicalRep.gender);
    representativeLine = `Représentée aux fins des présentes par la société ${representative.name} en tant que ${representative.role}, elle-même représentée par ${physicalRep.name} en tant que ${physicalRep.role}, dûment ${genderAgreement}.`;
  } else if (representative.isHolding) {
    // Corporate representative without identified physical person
    representativeLine = `Représentée aux fins des présentes par ${representative.name} en tant que ${representative.role}.`;
  } else {
    // Standard individual representative
    const genderAgreement = getGenderAgreement(representative.gender);
    representativeLine = `Représentée aux fins des présentes par ${representative.name} en sa qualité de ${representative.role}, dûment ${genderAgreement}.`;
  }

  return `${title}

${details}

${representativeLine}`;
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

  console.log(
    `📊 Found ${pouvoirs.length} representatives:`,
    pouvoirs.map((p) => ({ role: p.roleEntreprise, type: p.entreprise ? "Company" : "Person" })),
  );

  // Define role priority (highest to lowest priority)
  const rolePriority = ["5132", "73", "51", "30", "53"]; // President, President conseil admin, Manager, General Director

  // First, check if there's a President (5132 or 73) - always prioritize President
  let pouvoir: Record<string, unknown>;
  const president = pouvoirs.find(
    (p: Record<string, unknown>) => p.roleEntreprise === "5132" || p.roleEntreprise === "73",
  );

  if (president) {
    console.log("🎯 Found President - selecting as priority representative", {
      role: president.roleEntreprise,
      isCompany: !!president.entreprise,
    });
    pouvoir = president;
  } else {
    console.log("⚠️ No President found, falling back to priority sorting");
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

    pouvoir = sortedPouvoirs[0];
  }

  // Handle individual representative (person) - NEW API FORMAT
  const individu = pouvoir.individu as { descriptionPersonne?: PersonDescription };
  if (individu?.descriptionPersonne) {
    const desc = individu.descriptionPersonne;
    const name = formatRepresentativeName(desc.prenoms || [], desc.nom || "");
    const roleCode = pouvoir.roleEntreprise as string;
    const role = getRoleName(roleCode || "");
    // Genre may not be present in new format, default to null
    const gender = desc.genre === "2" ? "F" : desc.genre === "1" ? "M" : null;

    return { name, role, gender, isHolding: false };
  }

  // Handle individual representative (person) - OLD API FORMAT (fallback)
  const personnePhysique = pouvoir.personnePhysique as { identite?: { descriptionPersonne?: PersonDescription } };
  if (personnePhysique?.identite?.descriptionPersonne) {
    const desc = personnePhysique.identite.descriptionPersonne;
    const name = formatRepresentativeName(desc.prenoms || [], desc.nom || "");
    const roleCode = pouvoir.roleEntreprise as string;
    const role = getRoleName(roleCode || "");
    const gender = desc.genre === "2" ? "F" : "M";

    return { name, role, gender, isHolding: false };
  }

  // Handle corporate representative (company)
  const entreprise = pouvoir.entreprise as Record<string, unknown>;
  if (entreprise?.denomination) {
    const name = (entreprise.denomination as string) || FALLBACK_VALUES.REPRESENTATIVE_NAME;
    const roleCode = pouvoir.roleEntreprise as string;
    const role = getRoleName(roleCode || "");

    console.log(`🏢 Found corporate representative "${name}":`, {
      availableFields: Object.keys(entreprise),
      entrepriseData: entreprise,
    });

    const extractedSiren = extractSirenFromEnterprise(entreprise);
    console.log(`🔍 Extracted SIREN for ${name}: ${extractedSiren}`);

    return { name, role, gender: null, isHolding: true, corporateSiren: extractedSiren };
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
