// Disable ANSI styling so Raycast developer console keeps logs readable
process.env.FORCE_COLOR = "0";
process.env.NO_COLOR = "1";
const ansiEscapePattern = `${String.fromCharCode(27)}\\[[0-9;]*m`;
const ansiPattern = new RegExp(ansiEscapePattern, "g");
const wrapConsoleMethod =
  (method: (...args: unknown[]) => void) =>
  (...args: unknown[]) => {
    method(...args.map((arg) => (typeof arg === "string" ? arg.replace(ansiPattern, "") : arg)));
  };
console.log = wrapConsoleMethod(console.log.bind(console));
console.warn = wrapConsoleMethod(console.warn.bind(console));
console.error = wrapConsoleMethod(console.error.bind(console));

import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Toast,
  environment,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { validateAndExtractSiren } from "./lib/utils";
import { AVAILABLE_TEMPLATE_VARIABLES } from "./lib/markdown-builder";
import { useCompanyData } from "./lib/useCompanyData";
import { ErrorView } from "./components/ErrorView";
import { CompanyDetailsView } from "./components/CompanyDetailsView";
import { CompanyData, Preferences } from "./types";

export default function Command() {
  return <SearchForm />;
}

function SearchForm() {
  const { push } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();
  const shouldReadClipboard = preferences.autoReadClipboard ?? true;
  const [sirenInput, setSirenInput] = useState<string>("");
  const [sirenError, setSirenError] = useState<string | undefined>();
  const [hasInitialisedFromClipboard, setHasInitialisedFromClipboard] = useState(false);
  const [templateOverride, setTemplateOverride] = useState<string>(preferences.outputTemplate ?? "");

  useEffect(() => {
    if (!shouldReadClipboard || hasInitialisedFromClipboard) {
      return;
    }

    let isMounted = true;

    async function bootstrapFromClipboard() {
      try {
        const clipboardContent = await Clipboard.readText();
        if (!isMounted) {
          return;
        }

        const trimmedValue = clipboardContent?.trim();
        const detectedSiren = trimmedValue ? validateAndExtractSiren(trimmedValue) : undefined;

        if (!trimmedValue || !detectedSiren) {
          setHasInitialisedFromClipboard(true);
          return;
        }

        setSirenInput(trimmedValue);
        if (sirenError) {
          setSirenError(undefined);
        }

        setHasInitialisedFromClipboard(true);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (environment.isDevelopment) {
          console.error("Failed to read clipboard", error);
        }

        await showToast({
          style: Toast.Style.Failure,
          title: "Unable to read clipboard",
          message: "Please check Raycast permissions.",
        });
        setHasInitialisedFromClipboard(true);
      }
    }

    void bootstrapFromClipboard();

    return () => {
      isMounted = false;
    };
  }, [shouldReadClipboard, hasInitialisedFromClipboard, sirenError]);

  function handleAction() {
    if (!sirenInput) {
      setSirenError("⚠️ Please enter a SIREN (9 digits) or a SIRET (14 digits).");
      return;
    }
    const siren = validateAndExtractSiren(sirenInput);
    if (!siren) {
      setSirenError("❌ Invalid format. A SIREN must contain 9 digits and a SIRET 14 digits.");
      return;
    }
    setSirenError(undefined);
    push(<CompanyDetail siren={siren} templateOverride={templateOverride} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Search Company" onAction={handleAction} shortcut={{ modifiers: [], key: "return" }} />
          <Action.Push
            title="Edit Template"
            shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
            target={
              <TemplateEditor
                initialTemplate={templateOverride}
                onSave={(value) => {
                  setTemplateOverride(value);
                }}
              />
            }
          />
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

function CompanyDetail({ siren, templateOverride }: { siren: string; templateOverride?: string }) {
  const { data, isLoading, error } = useCompanyData(siren);

  // Log API response for debugging in development
  if (data && environment.isDevelopment) {
    logApiResponse(data);
  }

  // Handle error state
  if (error) {
    return (
      <Detail
        markdown={`## ⚠️ Unable to load data\n\nSomething went wrong while fetching the company information. Please review the error message that appeared and try again.\n\n**SIREN searched:** ${siren}`}
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
    return <CompanyDetailsView data={data} templateOverride={templateOverride} />;
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

function TemplateEditor({ initialTemplate, onSave }: { initialTemplate: string; onSave: (value: string) => void }) {
  const { pop } = useNavigation();
  const [value, setValue] = useState(initialTemplate);

  function handleSave() {
    onSave(value.trim());
    void showToast({
      style: Toast.Style.Success,
      title: "Template updated",
    });
    pop();
  }

  return (
    <Form
      enableDrafts
      navigationTitle="Edit Template"
      actions={
        <ActionPanel>
          <Action title="Save Template" onAction={handleSave} shortcut={{ modifiers: ["cmd"], key: "s" }} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="template"
        title="Custom Template"
        placeholder="{{company_header}}\n\n{{company_details}}\n\n{{representative_line}}"
        value={value}
        onChange={setValue}
        info="Leave empty to use the default template."
      />
      <Form.Separator />
      <Form.Description title="Available Variables" text="The template supports the following placeholders:" />
      {buildVariableSections()}
    </Form>
  );
}

function buildVariableSections() {
  const sections: JSX.Element[] = [];

  const entries = Object.entries(AVAILABLE_TEMPLATE_VARIABLES);
  for (const [index, [groupKey, variables]] of entries.entries()) {
    const groupTitle =
      groupKey === "personneMorale"
        ? "Corporate entities"
        : groupKey === "personnePhysique"
          ? "Individual entrepreneurs"
          : "Common";

    const text = variables.map((variable) => `• ${variable}`).join("\n");
    if (index > 0) {
      sections.push(<Form.Separator key={`separator-${groupKey}`} />);
    }
    sections.push(<Form.Description key={groupKey} title={groupTitle} text={text} />);
  }

  return sections;
}
