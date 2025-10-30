import { getPreferenceValues } from "@raycast/api";
import { CompanyData, RepresentativeInfo, PersonDescription, Preferences, OutputLanguage } from "../types";
import {
  formatAddress,
  formatField,
  formatSiren,
  formatSirenEnglish,
  formatFrenchNumber,
  formatEnglishNumber,
  getGenderAgreement,
  getLegalFormLabel,
  getLegalFormLabelEnglish,
  getRoleName,
  getRoleNameEnglish,
  getRoleNameEnglishByCode,
  getRepresentativePronoun,
  getEnglishAuthorizationPhrase,
  getCorporateAuthorizationPhrase,
  FALLBACK_VALUES,
} from "./utils";
import { formatRepresentativeName, formatCityName } from "./formatting";
import { findGreffeByCodePostal } from "./greffe-lookup";
import { findPhysicalRepresentative, extractSirenFromEnterprise } from "./recursive-representative-search";

type TemplateVariables = Record<string, string>;

interface BuildMarkdownOptions {
  template?: string;
  language?: OutputLanguage;
}

const DEFAULT_LANGUAGE: OutputLanguage = "fr";

const PERSONNE_PHYSIQUE_TEMPLATES: Record<OutputLanguage, string> = {
  fr: [
    "{{civility}} {{full_name}}",
    "{{birth_statement}}",
    "{{nationality_line}}",
    "{{personal_address_line}}",
    "N° : {{siren_formatted}}",
  ].join("\n"),
  en: [
    "{{civility}} {{full_name}}",
    "{{birth_statement}}",
    "{{nationality_line}}",
    "{{personal_address_line}}",
    "No.: {{siren_formatted}}",
  ].join("\n"),
};

const PERSONNE_MORALE_TEMPLATES: Record<OutputLanguage, string> = {
  fr: [
    "**La société {{company_name}}**",
    "",
    "{{share_capital_line}}",
    "{{registration_line}}",
    "{{head_office_line}}",
    "",
    "{{representative_line}}",
  ].join("\n"),
  en: [
    "{{company_header}}",
    "{{share_capital_line}}",
    "{{head_office_line}}",
    "{{registration_line}}",
    "{{representative_line}}",
  ].join("\n"),
};

const PERSONNE_PHYSIQUE_STRINGS = {
  fr: {
    civility: (gender: string | undefined) => (gender === "2" ? "Madame" : "Monsieur"),
    ne: (gender: string | undefined) => (gender === "2" ? "Née" : "Né"),
    birthStatement: (neWord: string, date: string, place: string) => `${neWord}(e) le ${date} à ${place}`,
    nationalityLine: (nationality: string) => `De nationalité ${nationality}`,
    addressLine: (address: string) => `Demeurant ${address}`,
    numberLabel: "N° : ",
  },
  en: {
    civility: (gender: string | undefined) => (gender === "2" ? "Ms." : "Mr."),
    ne: () => "Born",
    birthStatement: (_neWord: string, date: string, place: string) => `Born on ${date} in ${place}`,
    nationalityLine: (nationality: string) => `Of ${nationality} nationality`,
    addressLine: (address: string) => `Residing at ${address}`,
    numberLabel: "No.: ",
  },
} as const;

const PERSONNE_MORALE_STRINGS_FR = {
  companyHeader: (denomination: string) => `**La société ${denomination}**`,
  shareCapitalLine: (legalForm: string, shareCapitalWithCurrency: string) =>
    `${legalForm} au capital de ${shareCapitalWithCurrency}`,
  registrationLine: (rcsCity: string, sirenFormatted: string) =>
    `Immatriculée au RCS de ${rcsCity} sous le n° ${sirenFormatted}`,
  headOfficeLine: (address: string) => `Dont le siège social est situé ${address}`,
  representativeLine: (name: string, role: string, genderAgreement: string) =>
    `Représentée aux fins des présentes par ${name} en sa qualité de ${role}, dûment ${genderAgreement}.`,
  holdingLine: (holdingName: string, holdingRole: string) =>
    `Représentée aux fins des présentes par ${holdingName} en tant que ${holdingRole}.`,
  holdingWithRepresentativeLine: (
    holdingName: string,
    holdingRole: string,
    physicalName: string,
    physicalRole: string,
    genderAgreement: string,
  ) =>
    `Représentée aux fins des présentes par la société ${holdingName} en tant que ${holdingRole}, elle-même représentée par ${physicalName} en tant que ${physicalRole}, dûment ${genderAgreement}.`,
} as const;

export const AVAILABLE_TEMPLATE_VARIABLES = {
  common: [
    "company_type",
    "siren",
    "siren_formatted",
    "company_name",
    "legal_form",
    "company_header",
    "company_details",
  ],
  personneMorale: [
    "legal_form",
    "legal_form_english",
    "share_capital",
    "share_capital_raw",
    "share_capital_with_currency",
    "share_capital_line",
    "share_capital_currency",
    "company_header",
    "company_details",
    "rcs_city",
    "registration_line",
    "head_office_address",
    "head_office_line",
    "representative_name",
    "representative_role",
    "representative_role_english",
    "representative_gender",
    "representative_is_holding",
    "representative_line",
    "representative_pronoun",
    "representative_verb",
    "holding_representative_name",
    "holding_representative_role",
    "holding_representative_gender",
    "holding_representative_pronoun",
    "holding_representative_verb",
    "holding_representative_role_english",
  ],
  personnePhysique: [
    "civility",
    "first_name",
    "last_name",
    "full_name",
    "birth_date",
    "birth_place",
    "birth_statement",
    "ne_word",
    "nationality",
    "nationality_line",
    "personal_address",
    "personal_address_line",
    "representative_pronoun",
    "representative_verb",
  ],
} as const;

function getUserTemplate(): string | undefined {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const template = preferences?.outputTemplate;
    if (typeof template === "string" && template.trim().length > 0) {
      return template;
    }
  } catch {
    // Preferences are not available outside Raycast (e.g. during tests)
  }
  return undefined;
}

function renderTemplate(template: string, variables: TemplateVariables): string {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => {
    const value = variables[key];
    return value !== undefined ? value : "";
  });
}

/**
 * Main function to build markdown based on company type.
 */
export function buildMarkdown(data: CompanyData, options?: BuildMarkdownOptions): string {
  const content = data.formality.content;
  const templateOverride = options?.template ?? getUserTemplate();
  const language = options?.language ?? DEFAULT_LANGUAGE;

  if (content.personnePhysique) {
    return buildPersonnePhysiqueMarkdown(data, templateOverride, language);
  }

  if (content.personneMorale) {
    return buildPersonneMoraleMarkdown(data, templateOverride, language);
  }

  return "No information to display.";
}

/**
 * Async version of buildMarkdown that supports recursive representative search.
 */
export async function buildMarkdownAsync(data: CompanyData, options?: BuildMarkdownOptions): Promise<string> {
  const content = data.formality.content;
  const templateOverride = options?.template ?? getUserTemplate();
  const language = options?.language ?? DEFAULT_LANGUAGE;

  if (content.personnePhysique) {
    return buildPersonnePhysiqueMarkdown(data, templateOverride, language);
  }

  if (content.personneMorale) {
    return await buildPersonneMoraleMarkdownAsync(data, templateOverride, language);
  }

  return "No information to display.";
}

/**
 * Builds markdown for individual entrepreneurs (personnePhysique)
 */
export function buildPersonnePhysiqueMarkdown(
  data: CompanyData,
  templateOverride?: string,
  language: OutputLanguage = DEFAULT_LANGUAGE,
): string {
  const personnePhysique = data.formality.content.personnePhysique!;
  const desc = personnePhysique.identite?.entrepreneur?.descriptionPersonne;

  const strings = PERSONNE_PHYSIQUE_STRINGS[language];

  const civilite = strings.civility(desc?.genre);
  const prenom = (desc?.prenoms || [])[0] || "";
  const nom = desc?.nom || "";
  const fullName = `${prenom} ${nom}`.trim() || FALLBACK_VALUES.REPRESENTATIVE_NAME;

  const ne = strings.ne(desc?.genre);
  const dateNaissance = formatField(desc?.dateDeNaissance, FALLBACK_VALUES.BIRTH_DATE);
  const lieuNaissance = formatField(desc?.lieuDeNaissance, FALLBACK_VALUES.BIRTH_PLACE);
  const nationalite = formatField(desc?.nationalite, FALLBACK_VALUES.NATIONALITY);
  const birthStatement = strings.birthStatement(ne, dateNaissance, lieuNaissance);
  const nationalityLine = strings.nationalityLine(nationalite);

  const adresse = personnePhysique.adressePersonne
    ? formatAddress(personnePhysique.adressePersonne)
    : formatAddress(personnePhysique.adresseEntreprise);
  const demeurant = formatField(adresse, FALLBACK_VALUES.ADDRESS);
  const personalAddressLine = strings.addressLine(demeurant);

  const siren = data.formality.siren;
  const sirenFormatted = language === "en" ? formatSirenEnglish(siren) : formatSiren(siren);

  const legalFormCode = data.formality.content.natureCreation?.formeJuridique;
  const legalForm = legalFormCode ? getLegalFormLabel(legalFormCode) : "";
  const legalFormEnglish = getLegalFormLabelEnglish(legalForm);
  const representativePronoun = getRepresentativePronoun(desc?.genre || null);
  const representativeAuthorization = getEnglishAuthorizationPhrase(desc?.genre || null);
  const representativeVerb =
    language === "en" ? representativeAuthorization.verb : language === "fr" ? "est" : representativeAuthorization.verb;

  const companyDetails = [
    birthStatement,
    nationalityLine,
    personalAddressLine,
    `${strings.numberLabel}${sirenFormatted}`,
  ].join("\n");

  const variables: TemplateVariables = {
    company_type: "personne_physique",
    company_name: fullName,
    company_header: `${civilite} ${fullName}`,
    company_details: companyDetails,
    siren,
    siren_formatted: sirenFormatted,
    legal_form: legalForm,
    legal_form_english: legalFormEnglish,
    civility: civilite,
    first_name: prenom,
    last_name: nom,
    full_name: fullName,
    birth_date: dateNaissance,
    birth_place: lieuNaissance,
    birth_statement: birthStatement,
    ne_word: ne,
    nationality: nationalite,
    nationality_line: nationalityLine,
    personal_address: demeurant,
    personal_address_line: personalAddressLine,
    share_capital: "",
    share_capital_raw: "",
    share_capital_with_currency: "",
    share_capital_line: "",
    share_capital_currency: "€",
    rcs_city: "",
    registration_line: "",
    head_office_address: demeurant,
    head_office_line: personalAddressLine,
    representative_name: fullName,
    representative_role: FALLBACK_VALUES.REPRESENTATIVE_ROLE,
    representative_role_english: FALLBACK_VALUES.REPRESENTATIVE_ROLE,
    representative_gender: desc?.genre || "",
    representative_is_holding: "false",
    representative_line: "",
    representative_pronoun: representativePronoun,
    representative_verb: representativeVerb,
    holding_representative_name: "",
    holding_representative_role: "",
    holding_representative_gender: "",
    holding_representative_pronoun: "",
    holding_representative_role_english: "",
    holding_representative_verb: "",
  };

  const template = templateOverride ?? PERSONNE_PHYSIQUE_TEMPLATES[language];
  return renderTemplate(template, variables);
}

/**
 * Builds markdown for corporate entities (personneMorale) - synchronous version.
 */
export function buildPersonneMoraleMarkdown(
  data: CompanyData,
  templateOverride?: string,
  language: OutputLanguage = DEFAULT_LANGUAGE,
): string {
  const content = data.formality.content;
  const personneMorale = content.personneMorale!;

  const representative = extractRepresentativeInfo(personneMorale.composition || {});
  const variables = createPersonneMoraleTemplateVariables(data, representative, language);

  const template = templateOverride ?? PERSONNE_MORALE_TEMPLATES[language];
  return renderTemplate(template, variables);
}

/**
 * Builds markdown for corporate entities (personneMorale) - async version with recursive search.
 */
export async function buildPersonneMoraleMarkdownAsync(
  data: CompanyData,
  templateOverride?: string,
  language: OutputLanguage = DEFAULT_LANGUAGE,
): Promise<string> {
  const content = data.formality.content;
  const personneMorale = content.personneMorale!;

  let representative = extractRepresentativeInfo(personneMorale.composition || {});

  if (representative.isHolding && representative.corporateSiren) {
    console.log(
      `🔍 Attempting recursive search for holding ${representative.name} (SIREN: ${representative.corporateSiren})`,
    );
    try {
      representative = await findPhysicalRepresentative(
        representative.name,
        representative.corporateSiren,
        representative.role,
        representative.roleCode,
      );
    } catch (error) {
      console.error(`❌ Failed to find physical representative for ${representative.name}:`, error);
    }
  }

  const variables = createPersonneMoraleTemplateVariables(data, representative, language);
  const template = templateOverride ?? PERSONNE_MORALE_TEMPLATES[language];
  return renderTemplate(template, variables);
}

function createPersonneMoraleTemplateVariables(
  data: CompanyData,
  representative: RepresentativeInfo,
  language: OutputLanguage,
): TemplateVariables {
  const content = data.formality.content;
  const personneMorale = content.personneMorale!;
  const natureCreation = content.natureCreation;

  const siren = data.formality.siren;
  const sirenFormattedFrench = formatSiren(siren);
  const sirenFormattedEnglish = formatSirenEnglish(siren);
  const sirenFormatted = language === "en" ? sirenFormattedEnglish : sirenFormattedFrench;
  const legalFormCode = natureCreation?.formeJuridique;
  const legalForm = legalFormCode ? getLegalFormLabel(legalFormCode) : "";

  const identite = personneMorale.identite;
  const denominationValue = identite?.entreprise?.denomination || personneMorale.denomination;
  const denomination = formatField(denominationValue, FALLBACK_VALUES.MISSING_DATA);
  const shareCapitalValue = identite?.description?.montantCapital ?? personneMorale.capital?.montant;
  const shareCapitalRaw = formatField(shareCapitalValue, FALLBACK_VALUES.MISSING_DATA);
  const shareCapitalFrench =
    shareCapitalRaw !== FALLBACK_VALUES.MISSING_DATA ? formatFrenchNumber(shareCapitalRaw) : shareCapitalRaw;
  const shareCapitalEnglish =
    shareCapitalRaw !== FALLBACK_VALUES.MISSING_DATA ? formatEnglishNumber(shareCapitalRaw) : shareCapitalRaw;
  const shareCapitalWithCurrencyFrench =
    shareCapitalFrench !== FALLBACK_VALUES.MISSING_DATA ? `${shareCapitalFrench}\u00A0€` : shareCapitalFrench;
  const shareCapitalWithCurrencyEnglish =
    shareCapitalEnglish !== FALLBACK_VALUES.MISSING_DATA ? `€${shareCapitalEnglish}` : shareCapitalEnglish;
  const legalFormEnglish = getLegalFormLabelEnglish(legalForm);
  const address = formatAddress(personneMorale.adresseEntreprise);
  const codePostal = personneMorale.adresseEntreprise?.adresse?.codePostal;
  const greffeFromData = codePostal ? findGreffeByCodePostal(codePostal) : null;
  const rawRcsCity = greffeFromData || personneMorale.immatriculationRcs?.villeImmatriculation;
  const rcsCity = rawRcsCity ? formatCityName(rawRcsCity) : FALLBACK_VALUES.RCS_CITY;
  const isEnglish = language === "en";

  let shareCapitalLine: string;
  let headOfficeLine: string;
  let registrationLine: string;
  let representativeLine: string;
  let companyHeader: string;
  let representativePronoun = "";
  let representativeVerb = "";
  let holdingPronoun = "";
  let holdingVerb = "";

  const resolveEnglishRole = (roleValue?: string, roleCodeValue?: string, explicitEnglish?: string): string => {
    if (explicitEnglish && explicitEnglish !== FALLBACK_VALUES.REPRESENTATIVE_ROLE) {
      return explicitEnglish;
    }

    if (roleCodeValue) {
      const mapped = getRoleNameEnglishByCode(roleCodeValue);
      if (mapped && !/^\[\[Role code/.test(mapped)) {
        return mapped;
      }
      if (mapped) {
        return mapped;
      }
    }

    if (roleValue) {
      return getRoleNameEnglish(roleValue);
    }

    return FALLBACK_VALUES.REPRESENTATIVE_ROLE;
  };

  const representativeRoleEnglishResolved = resolveEnglishRole(
    representative.role,
    representative.roleCode,
    representative.roleEnglish,
  );
  const holdingRepresentativeRoleEnglishResolved = resolveEnglishRole(
    representative.holdingRepresentative?.role,
    representative.holdingRepresentative?.roleCode,
    representative.holdingRepresentative?.roleEnglish,
  );

  if (isEnglish) {
    const frenchLegalForm = legalForm || FALLBACK_VALUES.MISSING_DATA;
    shareCapitalLine = `A ${legalFormEnglish} (*${frenchLegalForm}*) company, with a share capital of ${shareCapitalWithCurrencyEnglish},`;
    headOfficeLine = `Having its head office located at ${address},`;
    registrationLine = `Registered under number ${sirenFormattedEnglish} with the ${rcsCity} Trade and Companies Register,`;
    companyHeader = `**${denomination}**,`;

    if (representative.isHolding && representative.holdingRepresentative) {
      const physicalRep = representative.holdingRepresentative;
      const physicalAuthorization = getEnglishAuthorizationPhrase(physicalRep.gender);
      holdingPronoun = physicalAuthorization.pronoun;
      holdingVerb = physicalAuthorization.verb;
      representativePronoun = holdingPronoun;
      representativeVerb = holdingVerb;
      const holdingRoleEnglish = representativeRoleEnglishResolved;
      const physicalRoleEnglish = resolveEnglishRole(physicalRep.role, physicalRep.roleCode, physicalRep.roleEnglish);
      representativeLine = `Represented by the company ${representative.name}, its ${holdingRoleEnglish}, itself represented by ${physicalRep.name}, ${physicalRoleEnglish}, who warrants that ${holdingPronoun} ${holdingVerb} duly authorized for the purposes herein set out,`;
    } else if (representative.isHolding) {
      const corporateAuthorization = getCorporateAuthorizationPhrase();
      const corporatePronoun = corporateAuthorization.pronoun;
      const corporateVerb = corporateAuthorization.verb;
      const holdingRoleEnglish = representativeRoleEnglishResolved;
      representativeLine = `Represented by the company ${representative.name}, its ${holdingRoleEnglish}, which warrants that ${corporatePronoun} ${corporateVerb} duly authorized for the purposes herein set out,`;
      holdingPronoun = corporatePronoun;
      holdingVerb = corporateVerb;
      representativePronoun = corporatePronoun;
      representativeVerb = corporateVerb;
    } else {
      const authorization = getEnglishAuthorizationPhrase(representative.gender);
      representativePronoun = authorization.pronoun;
      representativeVerb = authorization.verb;
      const representativeRoleEnglish = representativeRoleEnglishResolved;
      representativeLine = `Represented by ${representative.name}, its ${representativeRoleEnglish}, who warrants that ${representativePronoun} ${representativeVerb} duly authorized for the purposes herein set out,`;
    }
  } else {
    const strings = PERSONNE_MORALE_STRINGS_FR;
    shareCapitalLine = strings.shareCapitalLine(
      legalForm || FALLBACK_VALUES.MISSING_DATA,
      shareCapitalWithCurrencyFrench,
    );
    headOfficeLine = strings.headOfficeLine(address);
    registrationLine = strings.registrationLine(rcsCity, sirenFormatted);
    companyHeader = strings.companyHeader(denomination);

    if (representative.isHolding && representative.holdingRepresentative) {
      const physicalRep = representative.holdingRepresentative;
      const genderAgreement = getGenderAgreement(physicalRep.gender, language);
      representativeLine = strings.holdingWithRepresentativeLine(
        representative.name,
        representative.role,
        physicalRep.name,
        physicalRep.role,
        genderAgreement,
      );
    } else if (representative.isHolding) {
      representativeLine = strings.holdingLine(representative.name, representative.role);
    } else {
      const genderAgreement = getGenderAgreement(representative.gender, language);
      representativeLine = strings.representativeLine(representative.name, representative.role, genderAgreement);
    }
  }

  const companyDetailsParts = isEnglish
    ? [shareCapitalLine, headOfficeLine, registrationLine]
    : [shareCapitalLine, registrationLine, headOfficeLine];
  const companyDetails = companyDetailsParts.join("\n");

  let holdingName = representative.holdingRepresentative?.name ?? "";
  let holdingRole = representative.holdingRepresentative?.role ?? "";
  let holdingGender = representative.holdingRepresentative?.gender ?? "";

  if (!representative.isHolding) {
    holdingName = "";
    holdingRole = "";
    holdingGender = "";
    holdingPronoun = "";
    holdingVerb = "";
  }
  const representativeRoleEnglish = representativeRoleEnglishResolved;
  const holdingRoleEnglish = representative.isHolding
    ? representative.holdingRepresentative
      ? holdingRepresentativeRoleEnglishResolved
      : representativeRoleEnglishResolved
    : "";
  const representativeVerbValue = representativeVerb || (language === "en" ? "is" : "");
  const holdingVerbValue = representative.isHolding ? holdingVerb : "";
  const shareCapitalValueForLanguage = isEnglish ? shareCapitalEnglish : shareCapitalFrench;
  const shareCapitalWithCurrencyForLanguage = isEnglish
    ? shareCapitalWithCurrencyEnglish
    : shareCapitalWithCurrencyFrench;

  return {
    company_type: "personne_morale",
    company_name: denomination,
    company_header: companyHeader,
    company_details: companyDetails,
    siren,
    siren_formatted: sirenFormatted,
    legal_form: legalForm,
    legal_form_english: legalFormEnglish,
    share_capital: shareCapitalValueForLanguage,
    share_capital_raw: shareCapitalRaw,
    share_capital_with_currency: shareCapitalWithCurrencyForLanguage,
    share_capital_line: shareCapitalLine,
    share_capital_currency: "€",
    rcs_city: rcsCity,
    registration_line: registrationLine,
    head_office_address: address,
    head_office_line: headOfficeLine,
    representative_name: representative.name,
    representative_role: representative.role,
    representative_role_english: representativeRoleEnglish,
    representative_gender: representative.gender ?? "",
    representative_is_holding: representative.isHolding ? "true" : "false",
    representative_line: representativeLine,
    representative_pronoun: representativePronoun,
    representative_verb: representativeVerbValue,
    holding_representative_name: holdingName,
    holding_representative_role: holdingRole,
    holding_representative_gender: holdingGender,
    holding_representative_pronoun: holdingPronoun,
    holding_representative_verb: holdingVerbValue,
    holding_representative_role_english: holdingRoleEnglish,
    civility: "",
    first_name: "",
    last_name: "",
    full_name: denomination,
    birth_date: "",
    birth_place: "",
    birth_statement: "",
    ne_word: "",
    nationality: "",
    nationality_line: "",
    personal_address: address,
    personal_address_line: headOfficeLine,
  };
}

/**
 * Extracts the most relevant representative information from the composition data.
 * Returns the highest-priority representative based on role hierarchy.
 */
export function extractRepresentativeInfo(composition: Record<string, unknown>): RepresentativeInfo {
  const fallback: RepresentativeInfo = {
    name: FALLBACK_VALUES.REPRESENTATIVE_NAME,
    role: FALLBACK_VALUES.REPRESENTATIVE_ROLE,
    roleCode: undefined,
    roleEnglish: FALLBACK_VALUES.REPRESENTATIVE_ROLE,
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
    const roleEnglish = getRoleNameEnglishByCode(roleCode || "");
    // Genre may not be present in new format, default to null
    const gender = desc.genre === "2" ? "F" : desc.genre === "1" ? "M" : null;

    return { name, role, roleCode, roleEnglish, gender, isHolding: false };
  }

  // Handle individual representative (person) - OLD API FORMAT (fallback)
  const personnePhysique = pouvoir.personnePhysique as { identite?: { descriptionPersonne?: PersonDescription } };
  if (personnePhysique?.identite?.descriptionPersonne) {
    const desc = personnePhysique.identite.descriptionPersonne;
    const name = formatRepresentativeName(desc.prenoms || [], desc.nom || "");
    const roleCode = pouvoir.roleEntreprise as string;
    const role = getRoleName(roleCode || "");
    const roleEnglish = getRoleNameEnglishByCode(roleCode || "");
    const gender = desc.genre === "2" ? "F" : "M";

    return { name, role, roleCode, roleEnglish, gender, isHolding: false };
  }

  // Handle corporate representative (company)
  const entreprise = pouvoir.entreprise as Record<string, unknown>;
  if (entreprise?.denomination) {
    const name = (entreprise.denomination as string) || FALLBACK_VALUES.REPRESENTATIVE_NAME;
    const roleCode = pouvoir.roleEntreprise as string;
    const role = getRoleName(roleCode || "");
    const roleEnglish = getRoleNameEnglishByCode(roleCode || "");

    console.log(`🏢 Found corporate representative "${name}":`, {
      availableFields: Object.keys(entreprise),
      entrepriseData: entreprise,
    });

    const extractedSiren = extractSirenFromEnterprise(entreprise);
    console.log(`🔍 Extracted SIREN for ${name}: ${extractedSiren}`);

    return { name, role, roleCode, roleEnglish, gender: null, isHolding: true, corporateSiren: extractedSiren };
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
