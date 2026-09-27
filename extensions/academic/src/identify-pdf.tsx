import { useMemo } from "react";
import { basename } from "node:path";
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { StagedWorkItem } from "./components/staged-work-item";
import { useAcademicSettings } from "./hooks/use-academic-settings";
import { useStagedSearch } from "./hooks/use-staged-search";
import { getSearchOptions } from "./preferences";
import { getEnabledProviders } from "./providers";
import {
  SearchModeFormDropdown,
  type SearchMode,
} from "./components/search-mode-dropdown";
import { analyzeOneDocument } from "./local-library/indexer";
import type { LocalDocument } from "./local-library/types";

export default function Command() {
  return <IdentifyPdf />;
}

export function IdentifyPdf({
  onModeChange,
}: {
  onModeChange?: (mode: SearchMode) => void;
}) {
  const { push } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();
  const { settings } = useAcademicSettings();
  return (
    <Form
      navigationTitle="Identify an Academic PDF"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Identify PDF"
            icon={Icon.MagnifyingGlass}
            onSubmit={async (values: { files: string[] }) => {
              const path = values.files?.[0];
              if (!path) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Choose a PDF file",
                });
                return;
              }
              const toast = await showToast({
                style: Toast.Style.Animated,
                title: "Checking metadata and OCR independently…",
              });
              const document = await analyzeOneDocument(
                path,
                settings,
                preferences,
              );
              toast.style =
                document.stage === "error"
                  ? Toast.Style.Failure
                  : Toast.Style.Success;
              toast.title =
                document.stage === "error"
                  ? "PDF analysis needs attention"
                  : document.validation?.safe
                    ? "PDF identity strictly verified"
                    : "PDF indexed; automatic rename remains blocked";
              toast.message = document.validation?.reason ?? document.error;
              push(
                <PdfResults
                  query={queryFromDocument(document)}
                  filename={document.filename}
                />,
              );
            }}
          />
        </ActionPanel>
      }
    >
      {onModeChange ? (
        <SearchModeFormDropdown value="pdf" onChange={onModeChange} />
      ) : null}
      <Form.FilePicker
        id="files"
        title="PDF File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles
      />
    </Form>
  );
}

function PdfResults({ query, filename }: { query: string; filename: string }) {
  const preferences = getPreferenceValues<Preferences>();
  const { settings, isLoading: settingsLoading } = useAcademicSettings();
  const providers = useMemo(
    () => getEnabledProviders(settings.metadataSources),
    [settings.metadataSources.join(",")],
  );
  const options = useMemo(
    () => getSearchOptions(preferences),
    [
      preferences.contactEmail,
      preferences.googleBooksApiKey,
      preferences.semanticScholarApiKey,
      preferences.coreApiKey,
    ],
  );
  const staged = useStagedSearch(query, providers, options, settings);
  const { results, isLoading } = staged.metadata;
  return (
    <List
      filtering
      isLoading={settingsLoading || isLoading}
      isShowingDetail={results.length > 0}
      navigationTitle={`Identify ${filename}`}
    >
      <List.Section
        title="Probable Matches"
        subtitle={`Detected query: ${query}`}
      >
        {results.map((work) => (
          <StagedWorkItem
            key={work.id}
            work={work}
            preliminaryResults={staged.preliminary.results}
            preliminaryFailures={staged.preliminary.failures}
            accessProviders={staged.accessProviders}
            accessSettings={staged.sourceSettings}
            options={options}
          />
        ))}
      </List.Section>
      {!isLoading && !results.length ? (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="Could not identify this PDF"
          description="The file may be scanned or lack searchable metadata."
        />
      ) : null}
    </List>
  );
}

function queryFromDocument(document: LocalDocument): string {
  const evidence = document.evidence;
  const identified =
    evidence?.doi ||
    evidence?.isbn ||
    document.work?.title ||
    evidence?.ocrTitle ||
    evidence?.embeddedTitle;
  if (identified) return identified;
  return basename(document.path)
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
