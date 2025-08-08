import { Action, ActionPanel, Detail, Form, useNavigation, environment } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState, useEffect } from "react";
import { getCompanyInfo, login } from "./services/inpi-api";
import { CompanyData, RepresentativeInfo } from "./types";
import {
  formatAddress,
  formatField,
  formatSiren,
  getGenderAgreement,
  getLegalFormLabel,
  getRoleName,
  validateAndExtractSiren,
  FALLBACK_VALUES,
} from "./utils";
import { findGreffeByCodePostal } from "./services/greffe-lookup";
// Removed fs and path imports - no longer needed for file-based logging

export default function Command() {
  return <SearchForm />;
}

function SearchForm() {
  const { push } = useNavigation();
  const [sirenInput, setSirenInput] = useState<string>("");
  const [sirenError, setSirenError] = useState<string | undefined>();

  function handleAction() {
    if (!sirenInput) {
      setSirenError("⚠️ Veuillez saisir un numéro SIREN (9 chiffres) ou SIRET (14 chiffres).");
      return;
    }
    const siren = validateAndExtractSiren(sirenInput);
    if (!siren) {
      setSirenError("❌ Format invalide. Le SIREN doit contenir 9 chiffres, le SIRET 14 chiffres.");
      return;
    }
    setSirenError(undefined);
    push(<CompanyDetail siren={siren} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Search Company" onAction={handleAction} shortcut={{ modifiers: [], key: "return" }} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="siren"
        title="SIREN / SIRET"
        placeholder="Ex: 123456789 (SIREN) ou 12345678901234 (SIRET)"
        value={sirenInput}
        error={sirenError}
        onChange={(newValue) => {
          setSirenInput(newValue);
          if (sirenError) {
            setSirenError(undefined);
          }
        }}
      />
    </Form>
  );
}

function CompanyDetail({ siren }: { siren: string }) {
  const { data, isLoading, error } = usePromise(
    async (sirenParam: string) => {
      const token = await login();
      return await getCompanyInfo(token, sirenParam);
    },
    [siren],
  );

  useEffect(() => {
    if (data) {
      logApiResponse(data);
    }
  }, [data]);

  if (error) {
    return (
      <Detail
        markdown={`## ⚠️ Erreur de recherche\n\n${error.message}\n\n### Que faire ?\n\n- 🔄 **Réessayez** : L'extension tente automatiquement plusieurs fois\n- ⚙️ **Vérifiez vos identifiants** : Ouvrez les préférences Raycast (Cmd+,)\n- 🌐 **Vérifiez votre connexion** : L'API INPI nécessite une connexion internet\n- 💬 **Contactez le support** : Si le problème persiste, consultez la [documentation](https://github.com/[repo]/base-rne-inpi#troubleshooting)`}
      />
    );
  }

  if (!isLoading && data && !data.formality?.content?.personneMorale && !data.formality?.content?.personnePhysique) {
    return (
      <Detail
        markdown={`## ❌ Aucune donnée trouvée\n\nL'API INPI n'a pas retourné de données pour le SIREN ${siren}.\n\n### Que faire ?\n\n- ✅ **Vérifiez le numéro SIREN** : Assurez-vous qu'il contient exactement 9 chiffres\n- ✅ **Vérifiez que l'entreprise existe** : Consultez [l'annuaire des entreprises](https://www.societe.com)\n- ✅ **Attendez quelques minutes** : Les données récentes peuvent mettre du temps à apparaître\n- ✅ **Contactez le support INPI** : Si l'entreprise existe mais n'apparaît pas\n\n### Informations techniques\n- SIREN recherché : **${siren}**\n- Source : API INPI\n- Statut : Aucune données personneMorale/personnePhysique`}
      />
    );
  }

  const { data: markdown } = usePromise(async () => {
    if (data) {
      return await buildMarkdown(data);
    }
    return "";
  }, [data]);

  return (
    <Detail
      isLoading={isLoading || !markdown}
      markdown={markdown || ""}
      metadata={data ? <Metadata data={data} /> : null}
      actions={
        markdown ? (
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy to Clipboard"
              content={{
                html: markdownToHtml(markdown),
                text: markdownToPlainText(markdown),
              }}
            />
          </ActionPanel>
        ) : null
      }
    />
  );
}

function Metadata({ data }: { data: CompanyData }) {
  const content = data.formality.content;
  const personneMorale = content.personneMorale;
  const personnePhysique = content.personnePhysique;
  const natureCreation = content.natureCreation;

  let denomination = "[[à compléter]]";
  let shareCapital = "[[à compléter]]";
  let rcsCity = "[[à compléter]]";
  let address = "[[à compléter]]";
  let codePostal: string | undefined;

  if (personneMorale) {
    const identite = personneMorale.identite;
    denomination = formatField(identite?.entreprise?.denomination);
    shareCapital = formatField(identite?.description?.montantCapital);
    address = formatAddress(personneMorale.adresseEntreprise);
    codePostal = personneMorale.adresseEntreprise?.adresse?.codePostal;
  } else if (personnePhysique) {
    const desc = personnePhysique.identite?.entrepreneur?.descriptionPersonne;
    const prenoms = desc?.prenoms?.join(" ") || "";
    denomination = `${prenoms} ${desc?.nom || ""}`.trim();
    shareCapital = "N/A";
    address = formatAddress(personnePhysique.adresseEntreprise);
    codePostal = personnePhysique.adresseEntreprise?.adresse?.codePostal;
  }

  const greffeFromData = codePostal ? findGreffeByCodePostal(codePostal) : null;
  rcsCity = formatField(greffeFromData || personneMorale?.immatriculationRcs?.villeImmatriculation);

  const sirenFormatted = formatSiren(data.formality.siren);

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="SIREN" text={data.formality.siren} />
      <Detail.Metadata.Label title="Dénomination" text={denomination} />
      <Detail.Metadata.Label title="Forme juridique" text={getLegalFormLabel(natureCreation.formeJuridique)} />
      <Detail.Metadata.Label title="Date création" text={formatField(natureCreation.dateCreation)} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label
        title="Capital social"
        text={shareCapital !== "[[à compléter]]" && shareCapital !== "N/A" ? `${shareCapital} €` : shareCapital}
      />
      <Detail.Metadata.Label
        title="RCS"
        text={rcsCity !== "[[à compléter]]" ? `${rcsCity} - ${sirenFormatted}` : `[[à compléter]] - ${sirenFormatted}`}
      />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Adresse" text={address} />
      <Detail.Metadata.Label title="Établie en France" text={natureCreation.etablieEnFrance ? "Oui" : "Non"} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Dernière MAJ INPI" text={data.updatedAt} />
      <Detail.Metadata.Label title="Établissements ouverts" text={data.nombreEtablissementsOuverts.toString()} />
    </Detail.Metadata>
  );
}

function logApiResponse(data: CompanyData) {
  // Only log in development environment to prevent sensitive data exposure
  if (environment.isDevelopment) {
    console.log("INPI API Response received:", {
      siren: data.formality.siren,
      timestamp: new Date().toISOString(),
      hasPersonneMorale: !!data.formality.content.personneMorale,
      hasPersonnePhysique: !!data.formality.content.personnePhysique,
      representantsCount: data.nombreRepresentantsActifs,
      etablissementsCount: data.nombreEtablissementsOuverts,
    });

    // Log structure for debugging without sensitive data
    if (data.formality.content.personneMorale) {
      console.log("PersonneMorale structure available:", {
        hasIdentite: !!data.formality.content.personneMorale.identite,
        hasComposition: !!data.formality.content.personneMorale.composition,
        hasAdresse: !!data.formality.content.personneMorale.adresseEntreprise,
      });
    }
  }
}

/**
 * Converts markdown to HTML for rich text copying to applications like Word
 */
function markdownToHtml(markdown: string): string {
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
function markdownToPlainText(markdown: string): string {
  return (
    markdown
      // Remove bold markdown (**text**)
      .replace(/\*\*(.*?)\*\*/g, "$1")
      // Remove italic markdown (*text*)
      .replace(/\*(.*?)\*/g, "$1")
      // Clean up extra whitespace and line breaks
      .replace(/\n\s*\n\s*\n/g, "\n\n")
      // Trim leading and trailing whitespace
      .trim()
  );
}

/**
 * Extracts and formats representative information from company composition data
 */
async function extractRepresentativeInfo(
  composition: NonNullable<CompanyData["formality"]["content"]["personneMorale"]>["composition"],
): Promise<RepresentativeInfo> {
  let representativeName = FALLBACK_VALUES.REPRESENTATIVE_NAME;
  let representativeRole = FALLBACK_VALUES.REPRESENTATIVE_ROLE;
  let representativeGender = null;

  // Enhanced logging for debugging
  if (environment.isDevelopment) {
    console.log("Composition data structure:", JSON.stringify(composition, null, 2));
  }

  if (composition?.pouvoirs && composition.pouvoirs.length > 0) {
    const pouvoir = composition.pouvoirs[0];

    if (environment.isDevelopment) {
      console.log("First pouvoir:", JSON.stringify(pouvoir, null, 2));
    }

    // Handle individual representative (person)
    if (pouvoir.individu?.descriptionPersonne) {
      const desc = pouvoir.individu.descriptionPersonne;
      const prenoms = desc.prenoms && desc.prenoms.length > 0 ? desc.prenoms[0] : "";
      representativeName = `${prenoms} ${desc.nom || ""}`.trim() || FALLBACK_VALUES.REPRESENTATIVE_NAME;

      // Get role code from the correct location (roleEntreprise)
      const roleCode = pouvoir.roleEntreprise || desc.role;

      representativeRole = getRoleName(roleCode || "");

      // Extract gender information - handle INPI format where "1" = masculin, "2" = féminin
      if (desc.genre === "1") {
        representativeGender = "M";
      } else if (desc.genre === "2") {
        representativeGender = "F";
      } else if (desc.genre === "M" || desc.genre === "F") {
        representativeGender = desc.genre;
      } else if (desc.sexe === "M" || desc.sexe === "F") {
        representativeGender = desc.sexe;
      } else if (desc.civilite) {
        if (desc.civilite.includes("M.") || desc.civilite.includes("Monsieur")) {
          representativeGender = "M";
        } else if (desc.civilite.includes("Mme") || desc.civilite.includes("Madame")) {
          representativeGender = "F";
        }
      }

      if (environment.isDevelopment) {
        console.log("Extracted individual representative:", {
          name: representativeName,
          role: representativeRole,
          gender: representativeGender,
          roleCode: roleCode,
        });
      }

      return { name: representativeName, role: representativeRole, gender: representativeGender };
    }
    // Handle corporate representative (company) - recursive lookup
    else if (pouvoir.entreprise?.denomination) {
      const entreprise = pouvoir.entreprise;
      const holdingName = entreprise.denomination || FALLBACK_VALUES.REPRESENTATIVE_NAME;

      // Get role code from roleEntreprise
      const roleCode = pouvoir.roleEntreprise;
      const holdingRole = getRoleName(roleCode || "");

      if (environment.isDevelopment) {
        console.log("Found corporate representative - fetching holding data:", {
          holdingName: holdingName,
          holdingRole: holdingRole,
          holdingSiren: entreprise.siren,
          roleCode: roleCode,
        });
      }

      // If we have a SIREN for the holding company, fetch its data to get the human representative
      if (entreprise.siren) {
        try {
          const token = await login();
          const holdingData = await getCompanyInfo(token, entreprise.siren);

          if (holdingData?.formality?.content?.personneMorale?.composition) {
            // Recursively extract the holding's representative
            const holdingRepresentativeInfo = await extractRepresentativeInfo(
              holdingData.formality.content.personneMorale.composition,
            );

            if (environment.isDevelopment) {
              console.log("Successfully fetched holding representative:", holdingRepresentativeInfo);
            }

            return {
              name: holdingName,
              role: holdingRole,
              gender: null,
              isHolding: true,
              holdingRepresentative: {
                name: holdingRepresentativeInfo.name,
                role: holdingRepresentativeInfo.role,
                gender: holdingRepresentativeInfo.gender,
              },
            };
          }
        } catch (error) {
          if (environment.isDevelopment) {
            console.log("Failed to fetch holding data, using fallback:", error);
          }
          // If we can't fetch holding data, return the holding info without cascade
        }
      }

      // Fallback when we can't fetch holding data
      return {
        name: holdingName,
        role: holdingRole,
        gender: null,
        isHolding: true,
      };
    } else {
      if (environment.isDevelopment) {
        console.log("No valid representative found in pouvoir - neither individu nor entreprise");
      }
    }
  } else {
    if (environment.isDevelopment) {
      console.log("No pouvoirs found or empty array");
    }
  }

  return { name: representativeName, role: representativeRole, gender: representativeGender };
}

/**
 * Builds markdown for individual entrepreneurs (personnePhysique)
 */
function buildPersonnePhysiqueMarkdown(data: CompanyData): string {
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
 * Builds markdown for corporate entities (personneMorale)
 */
async function buildPersonneMoraleMarkdown(data: CompanyData): Promise<string> {
  const content = data.formality.content;
  const personneMorale = content.personneMorale!;
  const natureCreation = content.natureCreation;

  // Extract basic company information
  const legalForm = getLegalFormLabel(natureCreation.formeJuridique);
  const sirenFormatted = formatSiren(data.formality.siren);

  const identite = personneMorale.identite;
  const denomination = formatField(identite?.entreprise?.denomination) || formatField(personneMorale.denomination);
  const shareCapital =
    formatField(identite?.description?.montantCapital) || formatField(personneMorale.capital?.montant);

  // Extract address and RCS information
  const address = formatAddress(personneMorale.adresseEntreprise);
  const codePostal = personneMorale.adresseEntreprise?.adresse?.codePostal;
  const greffeFromData = codePostal ? findGreffeByCodePostal(codePostal) : null;
  const rcsCity = formatField(greffeFromData || personneMorale.immatriculationRcs?.villeImmatriculation);

  // Build company header and details
  const title = `**La société ${denomination}**`;
  const details = `${legalForm} au capital de ${shareCapital} €
Immatriculée au RCS de ${rcsCity} sous le n° ${sirenFormatted}
Dont le siège social est situé ${address}`;

  // Extract representative information
  const representative = await extractRepresentativeInfo(personneMorale.composition);

  let representativeLine: string;
  if (representative.isHolding && representative.holdingRepresentative) {
    // Format cascade representation for holding companies
    const holdingGenderAgreement = getGenderAgreement(representative.holdingRepresentative.gender);
    const civilite = representative.holdingRepresentative.gender === "F" ? "Mme" : "M.";

    if (environment.isDevelopment) {
      console.log("Cascade formatting debug:", {
        holdingGender: representative.holdingRepresentative.gender,
        holdingGenderAgreement: holdingGenderAgreement,
        civilite: civilite,
        holdingName: representative.holdingRepresentative.name,
      });
    }

    representativeLine = `Représentée aux fins des présentes par ${representative.name} en tant que ${representative.role}, elle-même représentée par ${civilite} ${representative.holdingRepresentative.name}, en sa qualité de ${representative.holdingRepresentative.role}, dûment ${holdingGenderAgreement}.`;
  } else if (representative.isHolding) {
    // Fallback for holding companies without human representative data
    representativeLine = `Représentée aux fins des présentes par ${representative.name} en tant que ${representative.role}, [[représentant de la holding à compléter]].`;
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
 * Main function to build markdown based on company type
 */
async function buildMarkdown(data: CompanyData): Promise<string> {
  const content = data.formality.content;

  if (content.personnePhysique) {
    return buildPersonnePhysiqueMarkdown(data);
  }

  if (content.personneMorale) {
    return await buildPersonneMoraleMarkdown(data);
  }

  return "Aucune information à afficher.";
}
