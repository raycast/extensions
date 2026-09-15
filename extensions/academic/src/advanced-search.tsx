import { useMemo, type ReactElement, type ReactNode } from "react";
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
import { LANGUAGES } from "./config/catalog";
import { useAcademicSettings } from "./hooks/use-academic-settings";
import { useStagedSearch } from "./hooks/use-staged-search";
import { getSearchOptions } from "./preferences";
import { getEnabledProviders } from "./providers";
import { ENCYCLOPEDIA_PROVIDERS } from "./providers/encyclopedias";
import type { AdvancedSearchQuery, SearchRequest, WorkKind } from "./types";
import type { SearchMode } from "./components/search-mode-dropdown";
import { SearchModeFormDropdown } from "./components/search-mode-dropdown";

type Values = {
  general: string;
  title: string;
  authors: string;
  kind: WorkKind | "any";
  publisher: string;
  yearFrom: string;
  yearTo: string;
  journal: string;
  isbn: string;
  issn: string;
  doi: string;
  languages: string[];
  exactTitle: boolean;
  openAccessOnly: boolean;
  withAcceptedFilesOnly: boolean;
};

export default function Command() {
  return <AdvancedSearch />;
}

export function AdvancedSearch({
  onModeChange,
  modeSelector,
  renderResults,
}: {
  onModeChange?: (mode: SearchMode) => void;
  modeSelector?: ReactNode;
  renderResults?: (request: SearchRequest) => ReactElement;
}) {
  const { push } = useNavigation();
  const { settings, isLoading } = useAcademicSettings();

  const submit = async (values: Values) => {
    const advanced: AdvancedSearchQuery = {
      general: clean(values.general),
      title: clean(values.title),
      authors: clean(values.authors),
      kind: values.kind,
      publisher: clean(values.publisher),
      yearFrom: year(values.yearFrom),
      yearTo: year(values.yearTo),
      journal: clean(values.journal),
      isbn: clean(values.isbn),
      issn: clean(values.issn),
      doi: clean(values.doi),
      languages: values.languages,
      exactTitle: values.exactTitle,
      openAccessOnly: values.openAccessOnly,
      withAcceptedFilesOnly: values.withAcceptedFilesOnly,
    };
    const text = buildSearchText(advanced);
    if (text.length < 2) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter at least one search field",
      });
      return;
    }
    const request = { text, advanced } satisfies SearchRequest;
    push(
      renderResults ? (
        renderResults(request)
      ) : (
        <AdvancedResults request={request} />
      ),
    );
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Advanced Academic Search"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Search"
            icon={Icon.MagnifyingGlass}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      {modeSelector ??
        (onModeChange ? (
          <SearchModeFormDropdown value="advanced" onChange={onModeChange} />
        ) : null)}
      <Form.TextField
        id="general"
        title="Keywords"
        placeholder="Optional general terms"
      />
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Identity in Physics"
      />
      <Form.TextField
        id="authors"
        title="Authors"
        placeholder="French Krause, or Steven French; Décio Krause"
      />
      <Form.Dropdown id="kind" title="Work Type" defaultValue="any">
        <Form.Dropdown.Item value="any" title="Any" />
        <Form.Dropdown.Item value="book" title="Book" />
        <Form.Dropdown.Item value="article" title="Article" />
        <Form.Dropdown.Item value="thesis" title="Thesis / Dissertation" />
        <Form.Dropdown.Item value="report" title="Report" />
        <Form.Dropdown.Item value="encyclopedia" title="Encyclopedia Entry" />
      </Form.Dropdown>
      <Form.TextField id="publisher" title="Publisher" />
      <Form.TextField id="journal" title="Journal" />
      <Form.TextField id="yearFrom" title="Year From" placeholder="2000" />
      <Form.TextField id="yearTo" title="Year To" placeholder="2026" />
      <Form.Separator />
      <Form.TextField id="doi" title="DOI" />
      <Form.TextField id="isbn" title="ISBN" />
      <Form.TextField id="issn" title="ISSN" />
      <Form.TagPicker
        id="languages"
        title="Languages"
        defaultValue={settings.languages}
      >
        {LANGUAGES.map((language) => (
          <Form.TagPicker.Item
            key={language.id}
            value={language.id}
            title={language.title}
          />
        ))}
      </Form.TagPicker>
      <Form.Checkbox
        id="exactTitle"
        title="Title Matching"
        label="Require an exact or nearly exact title"
      />
      <Form.Checkbox
        id="openAccessOnly"
        title="Access"
        label="Only works with an open-access location"
      />
      <Form.Checkbox
        id="withAcceptedFilesOnly"
        title="Files"
        label="Only works with a file format accepted in Academic settings"
      />
    </Form>
  );
}

function AdvancedResults({ request }: { request: SearchRequest }) {
  const preferences = getPreferenceValues<Preferences>();
  const { settings, isLoading: settingsLoading } = useAcademicSettings();
  const encyclopediaSearch = request.advanced?.kind === "encyclopedia";
  const providers = useMemo(
    () =>
      encyclopediaSearch
        ? ENCYCLOPEDIA_PROVIDERS.filter((provider) =>
            settings.encyclopediaSources.includes(provider.id),
          )
        : getEnabledProviders(settings.metadataSources),
    [
      encyclopediaSearch,
      settings.metadataSources.join(","),
      settings.encyclopediaSources.join(","),
    ],
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
  const staged = useStagedSearch(
    request,
    providers,
    options,
    encyclopediaSearch ? { ...settings, sources: [] } : settings,
  );
  const { results, isLoading, notice } = staged.metadata;
  const failures = staged.preliminary.failures;
  return (
    <List
      filtering
      isLoading={isLoading || settingsLoading}
      isShowingDetail={results.length > 0}
      navigationTitle={
        encyclopediaSearch
          ? "Advanced Encyclopedia Results"
          : "Advanced Results"
      }
      searchBarPlaceholder="Filter consolidated results…"
    >
      {!isLoading && !results.length ? (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="No exact results"
          description={
            encyclopediaSearch && !providers.length
              ? "Enable at least one encyclopedia source in Config."
              : "Relax one or more advanced fields and try again."
          }
        />
      ) : null}
      {results.length ? (
        <List.Section
          title="Matching Works"
          subtitle={`${results.length} consolidated`}
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
      ) : null}
      {notice ? (
        <List.Section title="Language Notice">
          <List.Item title={notice} icon={Icon.ExclamationMark} />
        </List.Section>
      ) : null}
      {settings.showUnavailableSources && failures.length ? (
        <List.Section title="Unavailable Sources">
          {failures.map((failure) => (
            <List.Item
              key={failure.provider}
              title={failure.provider}
              subtitle={failure.message}
              icon={Icon.ExclamationMark}
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

function buildSearchText(query: AdvancedSearchQuery): string {
  return [
    query.doi,
    query.isbn,
    query.issn,
    query.title,
    query.authors,
    query.publisher,
    query.journal,
    query.general,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}
function clean(value?: string): string | undefined {
  return value?.trim() || undefined;
}
function year(value?: string): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}
