import { Action, ActionPanel, Detail, Form, useNavigation, environment } from "@raycast/api";
import { useState } from "react";
import { validateAndExtractSiren } from "./lib/utils";
import { useCompanyData } from "./lib/useCompanyData";
import { ErrorView } from "./components/ErrorView";
import { CompanyDetailsView } from "./components/CompanyDetailsView";
import { CompanyData } from "./types";

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
  const { data, isLoading, error } = useCompanyData(siren);

  // Log API response for debugging in development
  if (data && environment.isDevelopment) {
    logApiResponse(data);
  }

  // Handle error state
  if (error) {
    return (
      <Detail
        markdown={`## ⚠️ Impossible de charger les données\n\nUn problème est survenu. Veuillez vérifier le message d'erreur qui est apparu et réessayer.\n\n**SIREN recherché :** ${siren}`}
      />
    );
  }

  // Handle no data found
  const hasNoData =
    !isLoading && data && !data.formality?.content?.personneMorale && !data.formality?.content?.personnePhysique;
  if (hasNoData) {
    return <ErrorView siren={siren} hasNoData={true} />;
  }

  // Handle loading state
  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  // Handle successful data state
  if (data) {
    return <CompanyDetailsView data={data} />;
  }

  return <Detail markdown="Aucune information disponible." />;
}

function logApiResponse(data: CompanyData) {
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
