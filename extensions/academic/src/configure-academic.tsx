import { useEffect, useState, type ReactElement } from "react";
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  useNavigation,
  LaunchType,
  launchCommand,
  confirmAlert,
} from "@raycast/api";
import {
  ARTICLE_SOURCES,
  BOOK_SOURCES,
  COUNTRIES,
  ENCYCLOPEDIA_SOURCES,
  FILE_FORMATS,
  LANGUAGES,
  METADATA_SOURCES,
  SHARED_SOURCES,
  marketplaceId,
  type Option,
} from "./config/catalog";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type AcademicSettings,
} from "./lib/settings";
import { detectOllama } from "./local-library/analysis";
import {
  indexProgress,
  loadLocalIndex,
  localIndexPath,
  queueLocalDocumentsForReprocessing,
} from "./local-library/storage";
import type { AnalysisEngine, RenameMode } from "./local-library/types";

type ArrayField =
  | "sources"
  | "metadataSources"
  | "encyclopediaSources"
  | "languages"
  | "formats";

export default function Command() {
  const nativePreferences = getPreferenceValues<Preferences>();
  const [settings, setSettings] = useState<AcademicSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [localStatus, setLocalStatus] = useState("Not indexed yet");

  useEffect(() => {
    void loadSettings(nativePreferences).then((value) => {
      setSettings(value);
      setIsLoading(false);
    });
    void loadLocalIndex().then((index) => {
      const progress = indexProgress(index);
      setLocalStatus(
        progress.total
          ? `${progress.percent}% · ${progress.total} documents · ${progress.review} need review`
          : "No documents indexed",
      );
    });
  }, []);

  const apply = async (next: AcademicSettings, message: string) => {
    setSettings(next);
    await saveSettings(next, nativePreferences);
    await showToast({ style: Toast.Style.Success, title: message });
  };

  const reset = async () =>
    apply(DEFAULT_SETTINGS, "Recommended defaults restored");

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Academic Config"
      searchBarPlaceholder="Choose a settings section…"
    >
      <List.Section title="Sources">
        <ConfigItem
          title="Book Sources"
          subtitle={`${countSelected(settings.sources, BOOK_SOURCES)} enabled`}
          icon={Icon.Book}
          target={
            <OptionForm
              title="Book Sources"
              description="Repositories and catalogs used to find books."
              options={BOOK_SOURCES}
              field="sources"
              settings={settings}
              onSave={apply}
            />
          }
        />
        <ConfigItem
          title="Article Sources"
          subtitle={`${countSelected(settings.sources, ARTICLE_SOURCES)} enabled`}
          icon={Icon.Document}
          target={
            <OptionForm
              title="Article Sources"
              description="Repositories and indexes used to find articles."
              options={ARTICLE_SOURCES}
              field="sources"
              settings={settings}
              onSave={apply}
            />
          }
        />
        <ConfigItem
          title="Catalog-only Sources"
          subtitle={`${countSelected(settings.sources, SHARED_SOURCES)} enabled`}
          icon={Icon.Link}
          target={
            <OptionForm
              title="Catalog-only Sources"
              description="Used for both books and articles. Shadow-library adapters expose record pages only, never direct downloads."
              options={SHARED_SOURCES}
              field="sources"
              settings={settings}
              onSave={apply}
            />
          }
        />
        <ConfigItem
          title="Metadata and Bibliography"
          subtitle={`${settings.metadataSources.length} enabled`}
          icon={Icon.Text}
          target={
            <OptionForm
              title="Metadata and Bibliography"
              description="Providers allowed to supply covers, authors, publication data and citations."
              options={METADATA_SOURCES}
              field="metadataSources"
              settings={settings}
              onSave={apply}
            />
          }
        />
        <ConfigItem
          title="Encyclopedias"
          subtitle={`${settings.encyclopediaSources.length} enabled`}
          icon={Icon.Book}
          target={
            <OptionForm
              title="Encyclopedias"
              description="Reference sources used by Encyclopedia mode in Search."
              options={ENCYCLOPEDIA_SOURCES}
              field="encyclopediaSources"
              settings={settings}
              onSave={apply}
            />
          }
        />
      </List.Section>
      <List.Section title="Filters and Access">
        <ConfigItem
          title="Languages"
          subtitle={`${settings.languages.length} accepted`}
          icon={Icon.SpeechBubble}
          target={
            <OptionForm
              title="Languages"
              description="Preferred result languages. Academic falls back when none are found."
              options={LANGUAGES}
              field="languages"
              settings={settings}
              onSave={apply}
            />
          }
        />
        <ConfigItem
          title="Countries and Marketplaces"
          subtitle={
            settings.countries.length
              ? `${settings.countries.length} countries enabled`
              : "None enabled"
          }
          icon={Icon.Globe}
          target={<CountryForm settings={settings} onSave={apply} />}
        />
        <ConfigItem
          title="File Formats"
          subtitle={`${settings.formats.length} accepted`}
          icon={Icon.Download}
          target={
            <OptionForm
              title="File Formats"
              description="Accepted full-text formats. Catalog and metadata records are unaffected."
              options={FILE_FORMATS}
              field="formats"
              settings={settings}
              onSave={apply}
            />
          }
        />
        <ConfigItem
          title="Behavior and Citations"
          subtitle={`Default: ${settings.defaultCitationStyle.toUpperCase()}`}
          icon={Icon.Gear}
          target={<BehaviorForm settings={settings} onSave={apply} />}
        />
      </List.Section>
      <List.Section title="Local Research Library">
        <ConfigItem
          title="Folders and Safe Renaming"
          subtitle={
            settings.localFolders.length
              ? `${settings.localFolders.length} monitored folder${settings.localFolders.length === 1 ? "" : "s"}`
              : "No folder selected"
          }
          icon={Icon.Folder}
          target={<LocalFolderForm settings={settings} onSave={apply} />}
        />
        <ConfigItem
          title="Experimental Analysis"
          subtitle={
            settings.enableExperimentalAnalysis
              ? engineTitle(settings.analysisEngine)
              : "Disabled (default)"
          }
          icon={Icon.Stars}
          target={<AnalysisEngineForm settings={settings} onSave={apply} />}
        />
        <List.Item
          title="Index Progress"
          subtitle={localStatus}
          icon={Icon.Circle}
          actions={
            <ActionPanel>
              <Action
                title="Index Next Batch"
                icon={Icon.ArrowClockwise}
                onAction={() =>
                  launchCommand({
                    name: "index-local-library",
                    type: LaunchType.UserInitiated,
                  })
                }
              />
              <Action
                title="Reprocess All with Current Engine"
                icon={Icon.ArrowCounterClockwise}
                onAction={async () => {
                  const confirmed = await confirmAlert({
                    title: "Reprocess the local research index?",
                    message:
                      "Documents will be queued in small batches. Original files remain unchanged unless strict automatic renaming is enabled and every safety check passes.",
                    primaryAction: { title: "Queue Reprocessing" },
                  });
                  if (!confirmed) return;
                  const count = await queueLocalDocumentsForReprocessing();
                  setLocalStatus(`0% · ${count} documents queued`);
                  await showToast({
                    style: Toast.Style.Success,
                    title: `${count} documents queued`,
                  });
                }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Persistent JSON Index"
          subtitle={localIndexPath()}
          icon={Icon.Document}
          actions={
            <ActionPanel>
              <Action.ShowInFinder
                title="Show Persistent Index"
                path={localIndexPath()}
              />
              <Action.CopyToClipboard
                title="Copy Index Path"
                content={localIndexPath()}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Raycast">
        <List.Item
          title="Credentials and Institutional Access"
          subtitle={credentialSummary(nativePreferences)}
          icon={Icon.Lock}
          actions={
            <ActionPanel>
              <Action
                title="Open Native Raycast Settings"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Restore Recommended Defaults"
          subtitle="Basic book, article and metadata sources; no country or marketplace"
          icon={Icon.ArrowCounterClockwise}
          actions={
            <ActionPanel>
              <Action
                title="Restore Recommended Defaults"
                icon={Icon.ArrowCounterClockwise}
                onAction={reset}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function ConfigItem({
  title,
  subtitle,
  icon,
  target,
}: {
  title: string;
  subtitle: string;
  icon: Icon;
  target: ReactElement;
}) {
  return (
    <List.Item
      title={title}
      subtitle={subtitle}
      icon={icon}
      actions={
        <ActionPanel>
          <Action.Push
            title={`Configure ${title}`}
            icon={Icon.ArrowRight}
            target={target}
          />
        </ActionPanel>
      }
    />
  );
}

function OptionForm({
  title,
  description,
  options,
  field,
  settings,
  onSave,
}: {
  title: string;
  description: string;
  options: Option[];
  field: ArrayField;
  settings: AcademicSettings;
  onSave: (settings: AcademicSettings, message: string) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const initial = settings[field] as string[];
  const [selected, setSelected] = useState<string[]>(initial);
  const submit = async () => {
    await onSave({ ...settings, [field]: selected }, `${title} saved`);
    pop();
  };
  return (
    <Form
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            icon={Icon.Checkmark}
            onSubmit={submit}
          />
          <Action
            title="Select All"
            icon={Icon.Plus}
            onAction={() => setSelected(options.map((option) => option.id))}
          />
          <Action
            title="Clear All"
            icon={Icon.XMarkCircle}
            onAction={() => setSelected([])}
          />
        </ActionPanel>
      }
    >
      <Form.Description title={title} text={description} />
      {options.map((option) => (
        <Form.Checkbox
          key={option.id}
          id={`${field}-${option.id}`}
          title={option.title}
          label={option.description ?? "Enabled"}
          value={selected.includes(option.id)}
          onChange={(checked) =>
            setSelected((current) =>
              checked
                ? [...new Set([...current, option.id])]
                : current.filter((id) => id !== option.id),
            )
          }
        />
      ))}
    </Form>
  );
}

function CountryForm({
  settings,
  onSave,
}: {
  settings: AcademicSettings;
  onSave: (settings: AcademicSettings, message: string) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [selected, setSelected] = useState<string[]>(settings.countries);
  const submit = async () => {
    const marketplaces = COUNTRIES.filter((country) =>
      selected.includes(country.id),
    ).flatMap((country) =>
      country.marketplaces.map((marketplace) =>
        marketplaceId(country.id, marketplace.name),
      ),
    );
    await onSave(
      { ...settings, countries: selected, marketplaces },
      "Countries and marketplaces saved",
    );
    pop();
  };
  return (
    <Form
      navigationTitle="Countries and Marketplaces"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            icon={Icon.Checkmark}
            onSubmit={submit}
          />
          <Action
            title="Clear All"
            icon={Icon.XMarkCircle}
            onAction={() => setSelected([])}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Automatic Marketplaces"
        text="Selecting a country enables all marketplaces configured for that country. Clearing it removes those marketplaces."
      />
      {groupCountries().flatMap(([continent, countries]) => [
        <Form.Description
          key={`heading-${continent}`}
          title={continent}
          text={countries.map((country) => country.title).join(" · ")}
        />,
        ...countries.map((country) => (
          <Form.Checkbox
            key={country.id}
            id={`country-${country.id}`}
            title={country.title}
            label={country.marketplaces
              .map((marketplace) => marketplace.name)
              .join(" · ")}
            value={selected.includes(country.id)}
            onChange={(checked) =>
              setSelected((current) =>
                checked
                  ? [...new Set([...current, country.id])]
                  : current.filter((id) => id !== country.id),
              )
            }
          />
        )),
      ])}
    </Form>
  );
}

function BehaviorForm({
  settings,
  onSave,
}: {
  settings: AcademicSettings;
  onSave: (settings: AcademicSettings, message: string) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const submit = async (values: {
    includeUnknownLanguage: boolean;
    showWorksWithoutAcceptedFiles: boolean;
    hideLowConfidenceResults: boolean;
    showUnavailableSources: boolean;
    defaultCitationStyle: AcademicSettings["defaultCitationStyle"];
  }) => {
    await onSave({ ...settings, ...values }, "Behavior settings saved");
    pop();
  };
  return (
    <Form
      navigationTitle="Behavior and Citations"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            icon={Icon.Checkmark}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.Checkbox
        id="includeUnknownLanguage"
        title="Languages"
        label="Include records whose language is unknown"
        defaultValue={settings.includeUnknownLanguage}
      />
      <Form.Checkbox
        id="showWorksWithoutAcceptedFiles"
        title="Metadata-only Works"
        label="Keep works without an accepted full-text file"
        defaultValue={settings.showWorksWithoutAcceptedFiles}
      />
      <Form.Checkbox
        id="hideLowConfidenceResults"
        title="Result Quality"
        label="Hide weak and merely related results"
        defaultValue={settings.hideLowConfidenceResults}
      />
      <Form.Checkbox
        id="showUnavailableSources"
        title="Source Errors"
        label="Show unavailable sources below search results"
        defaultValue={settings.showUnavailableSources}
      />
      <Form.Dropdown
        id="defaultCitationStyle"
        title="Default Citation Style"
        defaultValue={settings.defaultCitationStyle}
      >
        <Form.Dropdown.Item value="abnt" title="ABNT" />
        <Form.Dropdown.Item value="apa" title="APA" />
        <Form.Dropdown.Item value="chicago" title="Chicago" />
        <Form.Dropdown.Item value="mla" title="MLA" />
      </Form.Dropdown>
    </Form>
  );
}

function countSelected(selected: string[], options: Option[]): number {
  return options.filter((option) => selected.includes(option.id)).length;
}
function credentialSummary(preferences: Preferences): string {
  const count = [
    preferences.contactEmail,
    preferences.googleBooksApiKey,
    preferences.semanticScholarApiKey,
    preferences.coreApiKey,
    preferences.openUrlResolver,
    preferences.openAIApiKey,
    preferences.anthropicApiKey,
    preferences.geminiApiKey,
  ].filter(Boolean).length;
  return count ? `${count} configured` : "Optional; stored securely by Raycast";
}
function groupCountries() {
  const groups = new Map<string, typeof COUNTRIES>();
  for (const country of COUNTRIES)
    groups.set(country.continent, [
      ...(groups.get(country.continent) ?? []),
      country,
    ]);
  return [...groups.entries()];
}

function LocalFolderForm({
  settings,
  onSave,
}: {
  settings: AcademicSettings;
  onSave: (settings: AcademicSettings, message: string) => Promise<void>;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Folders and Safe Renaming"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Local Library Settings"
            icon={Icon.Checkmark}
            onSubmit={async (values: {
              folders: string[];
              renameMode: RenameMode;
              articleTemplate: string;
              bookTemplate: string;
              otherTemplate: string;
            }) => {
              await onSave(
                {
                  ...settings,
                  localFolders: values.folders ?? [],
                  renameMode: values.renameMode,
                  articleRenameTemplate:
                    values.articleTemplate.trim() ||
                    DEFAULT_SETTINGS.articleRenameTemplate,
                  bookRenameTemplate:
                    values.bookTemplate.trim() ||
                    DEFAULT_SETTINGS.bookRenameTemplate,
                  otherRenameTemplate:
                    values.otherTemplate.trim() ||
                    DEFAULT_SETTINGS.otherRenameTemplate,
                },
                "Local library settings saved",
              );
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Safety Gate"
        text="Academic never renames from a filename, embedded metadata or DOI alone. Automatic rename requires an exact DOI/ISBN match, independent Apple Vision OCR title and author agreement, and no conflicting evidence. Existing files are never overwritten."
      />
      <Form.FilePicker
        id="folders"
        title="Monitored Folders"
        allowMultipleSelection
        canChooseDirectories
        canChooseFiles={false}
        defaultValue={settings.localFolders}
      />
      <Form.Dropdown
        id="renameMode"
        title="Renaming"
        defaultValue={settings.renameMode}
      >
        <Form.Dropdown.Item value="off" title="Off" />
        <Form.Dropdown.Item
          value="suggest"
          title="Suggestions Only (Recommended)"
        />
        <Form.Dropdown.Item
          value="automatic"
          title="Automatic Only After Strict Verification"
        />
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField
        id="articleTemplate"
        title="Article Filename"
        defaultValue={settings.articleRenameTemplate}
      />
      <Form.TextField
        id="bookTemplate"
        title="Book Filename"
        defaultValue={settings.bookRenameTemplate}
      />
      <Form.TextField
        id="otherTemplate"
        title="Other Filename"
        defaultValue={settings.otherRenameTemplate}
      />
      <Form.Description
        title="Template Fields"
        text="{author}, {year}, {type}, {title}, {journal}, {publisher}, {doi}, {isbn}"
      />
    </Form>
  );
}

function AnalysisEngineForm({
  settings,
  onSave,
}: {
  settings: AcademicSettings;
  onSave: (settings: AcademicSettings, message: string) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [baseUrl, setBaseUrl] = useState(settings.ollamaBaseUrl);
  return (
    <Form
      navigationTitle="Experimental Analysis"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Analysis Settings"
            icon={Icon.Checkmark}
            onSubmit={async (values: {
              enabled: boolean;
              engine: AnalysisEngine;
              allowExternal: boolean;
              ollamaModel: string;
              embeddingModel: string;
              documentsPerRun: string;
              pauseOnBattery: boolean;
            }) => {
              await onSave(
                {
                  ...settings,
                  enableExperimentalAnalysis: values.enabled,
                  analysisEngine: values.engine,
                  allowExternalAnalysis: values.allowExternal,
                  ollamaBaseUrl:
                    baseUrl.trim() || DEFAULT_SETTINGS.ollamaBaseUrl,
                  ollamaModel:
                    values.ollamaModel.trim() || DEFAULT_SETTINGS.ollamaModel,
                  ollamaEmbeddingModel:
                    values.embeddingModel.trim() ||
                    DEFAULT_SETTINGS.ollamaEmbeddingModel,
                  documentsPerRun: Math.max(
                    1,
                    Math.min(25, Number(values.documentsPerRun) || 3),
                  ),
                  pauseOnBattery: values.pauseOnBattery,
                },
                "Analysis settings saved",
              );
              pop();
            }}
          />
          <Action
            title="Detect Ollama and Installed Models"
            icon={Icon.MagnifyingGlass}
            onAction={async () => {
              const result = await detectOllama(baseUrl);
              await showToast({
                style: result.available
                  ? Toast.Style.Success
                  : Toast.Style.Failure,
                title: result.available
                  ? "Ollama detected"
                  : "Ollama not detected",
                message: result.available
                  ? result.models.length
                    ? result.models.join(", ")
                    : "No local model is installed"
                  : result.error,
              });
            }}
          />
          <Action
            title="Open Native Settings for API Keys"
            icon={Icon.Lock}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    >
      <Form.Checkbox
        id="enabled"
        title="Experimental Feature"
        label="Enable summaries, key points, keywords and semantic relationships"
        defaultValue={settings.enableExperimentalAnalysis}
      />
      <Form.Description
        title="Scope"
        text="Disabled by default. Basic folder indexing, DOI/ISBN detection, first-page OCR, bibliographic identification and strict rename verification continue to work without experimental analysis."
      />
      <Form.Separator />
      <Form.Dropdown
        id="engine"
        title="Engine"
        defaultValue={settings.analysisEngine}
      >
        <Form.Dropdown.Item value="local" title="Local Basic (Private)" />
        <Form.Dropdown.Item value="ollama" title="Ollama (Local and Private)" />
        <Form.Dropdown.Item value="raycast" title="Raycast AI" />
        <Form.Dropdown.Item value="openai" title="OpenAI API" />
        <Form.Dropdown.Item value="anthropic" title="Anthropic Claude API" />
        <Form.Dropdown.Item value="gemini" title="Google Gemini API" />
      </Form.Dropdown>
      <Form.Checkbox
        id="allowExternal"
        title="External Processing"
        label="Allow extracted excerpts to leave this Mac"
        defaultValue={settings.allowExternalAnalysis}
      />
      <Form.Description
        title="Privacy"
        text="This permission has no effect while Experimental Analysis is disabled. Local Basic and Ollama never require it. Raycast AI and external APIs silently fall back to Local Basic until explicit external processing permission is enabled. API keys remain in protected Raycast preferences and are never written to the library index."
      />
      <Form.Separator />
      <Form.TextField
        id="ollamaBaseUrl"
        title="Ollama URL"
        value={baseUrl}
        onChange={setBaseUrl}
        placeholder="http://127.0.0.1:11434"
      />
      <Form.TextField
        id="ollamaModel"
        title="Ollama Analysis Model"
        defaultValue={settings.ollamaModel}
      />
      <Form.TextField
        id="embeddingModel"
        title="Ollama Embedding Model"
        defaultValue={settings.ollamaEmbeddingModel}
      />
      <Form.TextField
        id="documentsPerRun"
        title="Documents per Background Run"
        defaultValue={String(settings.documentsPerRun)}
      />
      <Form.Checkbox
        id="pauseOnBattery"
        title="Energy"
        label="Pause background indexing while on battery"
        defaultValue={settings.pauseOnBattery}
      />
    </Form>
  );
}

function engineTitle(engine: AnalysisEngine): string {
  return {
    local: "Local Basic · private",
    ollama: "Ollama · local and private",
    raycast: "Raycast AI · external consent required",
    openai: "OpenAI API · key and consent required",
    anthropic: "Claude API · key and consent required",
    gemini: "Gemini API · key and consent required",
  }[engine];
}
