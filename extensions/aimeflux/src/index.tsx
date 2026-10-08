import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Detail,
  Form,
  Icon,
  List,
  PopToRootType,
  Toast,
  showToast,
  showHUD,
  useNavigation,
} from "@raycast/api";
import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  CommandRequest,
  Field,
  FormValues,
  Option,
  listModeNames,
  listModels,
  listModes,
  runAimeFlux,
} from "./cli";
import { Operation, operations } from "./operations";
import {
  parseCurrentModeRecord,
  importedHistoryItemWasCreated,
  parseHistoryItems,
  parseInstalledModels,
  parseImportedHistoryId,
  parsePackageRecord,
  stripImportedHistoryHeader,
  type CurrentModeRecord,
  type HistoryItem,
  type InstalledModel,
  type PackageRecord,
} from "./output-parsers";

type ExecutionState = {
  isLoading: boolean;
  result?: {
    commandLine: string;
    detached: boolean;
    exitCode: number;
    stdout: string;
    stderr: string;
  };
  error?: string;
};

type HistoryFilters = {
  limit: string;
  mode: string;
  query: string;
  source: string;
  range: string;
};

type ReplacementFilters = {
  globalOnly: boolean;
  mode: string;
};

type ReplacementItem = {
  scopeKey: string;
  scopeTitle: string;
  scopeSubtitle: string;
  from: string;
  to: string;
};

type WatchItem = {
  id: string;
  name: string;
  path: string;
  enabled: string;
  subfolders: string;
  mode: string;
  model: string;
  llm: string;
  formats: string;
  output: string;
  raw: string;
};

type PackageKind = "rule-package" | "mode-package";

type PackageItem = {
  id: string;
  name: string;
  enabled: boolean | null;
  summary: string;
  kind: PackageKind;
  record?: PackageRecord;
};

type ModeRecord = {
  id: string;
  name: string;
  language: string;
  translate: string;
  prompt: string;
  vocabulary: string;
  vocabularyEntries: string[];
  replacements: string;
  replacementEntries: Array<{ from: string; to: string }>;
  appBindings: string;
  raw: string;
};

type InstalledModelItem = InstalledModel & {
  watchReferences: string[];
};

const defaultHistoryFilters: HistoryFilters = {
  limit: "20",
  mode: "",
  query: "",
  source: "",
  range: "",
};

const defaultReplacementFilters: ReplacementFilters = {
  globalOnly: false,
  mode: "",
};

const reprocessLlmOptions: Option[] = [
  { title: "Original", value: "original" },
  { title: "On", value: "on" },
  { title: "Off", value: "off" },
];
const IMPORT_HISTORY_CHECK_LIMIT = 10;

export function ControlCenterCommand() {
  const groupedOperations = useMemo(() => {
    const groups = new Map<string, Operation[]>();

    for (const operation of operations) {
      const group = groups.get(operation.section) ?? [];
      group.push(operation);
      groups.set(operation.section, group);
    }

    return Array.from(groups.entries());
  }, []);

  return (
    <List searchBarPlaceholder="Search AimeFlux commands...">
      {groupedOperations.map(([section, sectionOperations]) => (
        <List.Section key={section} title={section}>
          {sectionOperations.map((operation) => (
            <List.Item
              key={operation.id}
              title={operation.title}
              subtitle={operation.description}
              icon={operation.icon}
              accessories={[{ tag: accessoryTagFor(operation.mode) }]}
              actions={<OperationActions operation={operation} />}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

export function OperationCommand({ operationId }: { operationId: string }) {
  const operation = operations.find(
    (candidate) => candidate.id === operationId,
  );

  if (!operation) {
    return (
      <Detail
        markdown={`# Unknown Command\n\nNo operation found for \`${operationId}\`.`}
      />
    );
  }

  if (operation.mode === "browser") {
    return browserTargetFor(operation);
  }

  if (operation.mode === "form") {
    return <OperationForm operation={operation} />;
  }

  return <AutoRunOperation operation={operation} />;
}

export default ControlCenterCommand;

function accessoryTagFor(mode: Operation["mode"]) {
  return mode === "browser" ? "Browser" : mode === "form" ? "Form" : "Direct";
}

function AutoRunOperation({ operation }: { operation: Operation }) {
  const request = useMemo(() => operation.buildRequest({}), [operation]);
  const [state, setState] = useState<ExecutionState>({ isLoading: true });

  useEffect(() => {
    let active = true;

    async function run() {
      try {
        if (operation.id === "history-copy-latest") {
          await copyLatestHistoryItem();
          if (active) {
            setState({
              isLoading: false,
              result: {
                commandLine: "",
                detached: false,
                exitCode: 0,
                stdout: "Latest history item copied.",
                stderr: "",
              },
            });
          }
          return;
        }

        if (operation.id === "history-paste-latest") {
          await pasteLatestHistoryItem();
          if (active) {
            setState({
              isLoading: false,
              result: {
                commandLine: "",
                detached: false,
                exitCode: 0,
                stdout: "Latest history item pasted.",
                stderr: "",
              },
            });
          }
          return;
        }

        if (operation.id === "cleanup-toggle") {
          const message = await toggleGlobalLlmCleanup();
          if (!active) {
            return;
          }

          if (operation.closeOnSuccess) {
            await closeMainWindow({ clearRootSearch: true });
            await showHUD(message);
            return;
          }

          setState({
            isLoading: false,
            result: {
              commandLine: "",
              detached: false,
              exitCode: 0,
              stdout: message,
              stderr: "",
            },
          });
          return;
        }

        const result = await executeRequest(operation.title, request);
        if (!active) {
          return;
        }

        if (result?.exitCode === 0 && operation.closeOnSuccess) {
          await closeToRootAndShowHUD(`${operation.title} complete`);
          return;
        }

        if (result) {
          setState({
            isLoading: false,
            result,
          });
        } else {
          setState({
            isLoading: false,
            result: {
              commandLine: "",
              detached: false,
              exitCode: 0,
              stdout: "",
              stderr: "",
            },
          });
        }
      } catch (error) {
        if (!active) {
          return;
        }

        setState({
          isLoading: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    run();

    return () => {
      active = false;
    };
  }, [operation, request]);

  return (
    <Detail
      navigationTitle={operation.title}
      isLoading={state.isLoading}
      markdown={renderMarkdown(operation.title, state)}
    />
  );
}

function OperationActions({ operation }: { operation: Operation }) {
  const request =
    operation.mode === "form" ? undefined : operation.buildRequest({});
  const isLatestHistoryAction =
    operation.id === "history-copy-latest" ||
    operation.id === "history-paste-latest";
  const isCleanupToggleAction = operation.id === "cleanup-toggle";

  return (
    <ActionPanel>
      {operation.mode === "browser" ? (
        <Action.Push
          title="Open Browser"
          icon={Icon.List}
          target={browserTargetFor(operation)}
        />
      ) : operation.mode === "form" ? (
        <Action.Push
          title="Open Command Form"
          icon={Icon.Pencil}
          target={<OperationForm operation={operation} />}
        />
      ) : isLatestHistoryAction ? (
        <Action
          title={
            operation.id === "history-copy-latest"
              ? "Copy Latest Item"
              : "Paste Latest Item"
          }
          icon={operation.icon}
          onAction={async () => {
            if (operation.id === "history-copy-latest") {
              await copyLatestHistoryItem();
            } else {
              await pasteLatestHistoryItem();
            }
          }}
        />
      ) : isCleanupToggleAction ? (
        <Action
          title="Toggle LLM Cleanup"
          icon={operation.icon}
          onAction={async () => {
            const message = await toggleGlobalLlmCleanup();
            await closeToRootAndShowHUD(message);
          }}
        />
      ) : operation.closeOnSuccess && request ? (
        <Action
          title="Run Command"
          icon={Icon.Play}
          onAction={async () => {
            const result = await executeRequest(operation.title, request);
            if (result?.exitCode === 0) {
              await closeToRootAndShowHUD(`${operation.title} complete`);
            }
          }}
        />
      ) : (
        <Action.Push
          title="Run Command"
          icon={Icon.Play}
          target={
            request ? (
              <ExecutionView title={operation.title} request={request} />
            ) : (
              <Detail markdown="Invalid operation." />
            )
          }
        />
      )}
    </ActionPanel>
  );
}

function browserTargetFor(operation: Operation) {
  switch (operation.presentation) {
    case "mode-current":
      return <CurrentModeView />;
    case "models":
      return <ModelBrowser />;
    case "rule-packages":
      return <PackageBrowser kind="rule-package" />;
    case "mode-packages":
      return <PackageBrowser kind="mode-package" />;
    case "watches":
      return <WatchBrowser />;
    case "replacements":
      return <ReplacementBrowser />;
    case "history":
    default:
      return <HistoryBrowser />;
  }
}

function OperationForm({ operation }: { operation: Operation }) {
  const { push } = useNavigation();
  const needsModes = useMemo(
    () =>
      (operation.fields ?? []).some((field) => field.optionsSource === "modes"),
    [operation.fields],
  );
  const needsModels = useMemo(
    () =>
      (operation.fields ?? []).some(
        (field) => field.optionsSource === "models",
      ),
    [operation.fields],
  );
  const [modeOptions, setModeOptions] = useState<Option[]>([]);
  const [modelOptions, setModelOptions] = useState<Option[]>([]);
  const [isLoadingModes, setIsLoadingModes] = useState(needsModes);
  const [isLoadingModels, setIsLoadingModels] = useState(needsModels);

  useEffect(() => {
    if (!needsModes) {
      setModeOptions([]);
      setIsLoadingModes(false);
      return;
    }

    let active = true;
    setIsLoadingModes(true);

    async function loadModes() {
      try {
        const modes = await listModes();
        if (!active) {
          return;
        }
        setModeOptions(modes);
      } catch (error) {
        if (!active) {
          return;
        }

        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load modes",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        if (active) {
          setIsLoadingModes(false);
        }
      }
    }

    loadModes();

    return () => {
      active = false;
    };
  }, [needsModes]);

  useEffect(() => {
    if (!needsModels) {
      setModelOptions([]);
      setIsLoadingModels(false);
      return;
    }

    let active = true;
    setIsLoadingModels(true);

    async function loadModelsForForm() {
      try {
        const models = await listModels();
        if (!active) {
          return;
        }
        setModelOptions(models);
      } catch {
        if (!active) {
          return;
        }
        const fallbackOptions = (operation.fields ?? [])
          .filter((field) => field.optionsSource === "models")
          .flatMap((field) => field.options ?? []);
        setModelOptions(dedupeOptions(fallbackOptions));
      } finally {
        if (active) {
          setIsLoadingModels(false);
        }
      }
    }

    loadModelsForForm();

    return () => {
      active = false;
    };
  }, [needsModels, operation.fields]);

  async function handleSubmit(values: FormValues) {
    const error = operation.validate?.(values);
    if (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: error,
      });
      return;
    }

    const request = operation.buildRequest(values);
    if (operation.presentation === "mode-detail") {
      push(<ModeDetailView modeId={request.args[2] ?? ""} />);
      return;
    }

    if (operation.closeOnSuccess) {
      const result = await executeRequest(operation.title, request);
      if (result?.exitCode === 0) {
        await closeToRootAndShowHUD(`${operation.title} complete`);
      }
      return;
    }

    push(<ExecutionView title={operation.title} request={request} />);
  }

  return (
    <Form
      navigationTitle={operation.title}
      isLoading={isLoadingModes || isLoadingModels}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Command" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {(operation.fields ?? []).map((field) => (
        <FieldInput
          key={field.id}
          field={field}
          modeOptions={modeOptions}
          modelOptions={modelOptions}
        />
      ))}
    </Form>
  );
}

function FieldInput({
  field,
  modeOptions,
  modelOptions,
}: {
  field: Field;
  modeOptions: Option[];
  modelOptions: Option[];
}) {
  if (field.type === "textarea") {
    return (
      <Form.TextArea
        id={field.id}
        title={field.label}
        placeholder={field.placeholder}
        defaultValue={
          typeof field.defaultValue === "string"
            ? field.defaultValue
            : undefined
        }
      />
    );
  }

  if (field.type === "dropdown") {
    const options = resolveOptions(field, modeOptions, modelOptions);
    return (
      <Form.Dropdown
        id={field.id}
        title={field.label}
        defaultValue={
          typeof field.defaultValue === "string"
            ? field.defaultValue
            : undefined
        }
      >
        {options.map((option, index) => (
          <Form.Dropdown.Item
            key={`${field.id}-${option.value || "blank"}-${index}`}
            value={option.value}
            title={option.title}
          />
        ))}
      </Form.Dropdown>
    );
  }

  if (field.type === "checkbox") {
    return (
      <Form.Checkbox
        id={field.id}
        label={field.label}
        defaultValue={field.defaultValue === true}
      />
    );
  }

  return (
    <Form.TextField
      id={field.id}
      title={field.label}
      placeholder={field.placeholder}
      defaultValue={
        typeof field.defaultValue === "string" ? field.defaultValue : undefined
      }
    />
  );
}

function resolveOptions(
  field: Field,
  modeOptions: Option[],
  modelOptions: Option[],
) {
  if (field.optionsSource === "modes") {
    return field.includeEmptyOption
      ? [{ title: "None", value: "" }, ...modeOptions]
      : modeOptions;
  }

  if (field.optionsSource === "models") {
    const merged = dedupeOptions([...(field.options ?? []), ...modelOptions]);
    return field.includeEmptyOption
      ? [{ title: "None", value: "" }, ...merged]
      : merged;
  }

  return field.options ?? [];
}

function dedupeOptions(options: Option[]) {
  return options.filter(
    (option, index, array) =>
      option.value &&
      array.findIndex((candidate) => candidate.value === option.value) ===
        index,
  );
}

function HistoryBrowser() {
  const [filters, setFilters] = useState<HistoryFilters>(defaultHistoryFilters);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [modeOptions, setModeOptions] = useState<Option[]>([]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError("");

    async function loadHistory() {
      try {
        const result = await runAimeFlux({
          label: "Browse History",
          args: buildHistoryArgs(filters),
        });

        if (!active) {
          return;
        }

        if (result.exitCode !== 0) {
          throw new Error(
            result.stderr || result.stdout || "Failed to load history.",
          );
        }

        setItems(parseHistoryItems(result.stdout));
      } catch (loadError) {
        if (!active) {
          return;
        }

        const message =
          loadError instanceof Error ? loadError.message : String(loadError);
        setError(message);
        setItems([]);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load history",
          message,
        });
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      active = false;
    };
  }, [filters]);

  useEffect(() => {
    let active = true;

    async function loadModeOptions() {
      try {
        const modes = await listModeNames();
        if (!active) {
          return;
        }

        setModeOptions(modes);
      } catch {
        if (!active) {
          return;
        }
      }
    }

    loadModeOptions();

    return () => {
      active = false;
    };
  }, []);

  const visibleItems = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return items.filter((item) => {
      if (!query) {
        return true;
      }

      return [
        item.id,
        item.timestamp,
        item.mode,
        item.source,
        item.summary,
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [items, searchText]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="History"
      searchBarPlaceholder="Filter loaded history items..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Mode"
          storeValue={false}
          value={filters.mode}
          onChange={(mode) => setFilters((current) => ({ ...current, mode }))}
        >
          <List.Dropdown.Item title="All Modes" value="" />
          {modeOptions.map((option) => (
            <List.Dropdown.Item
              key={option.value}
              title={option.title}
              value={option.value}
            />
          ))}
        </List.Dropdown>
      }
      onSearchTextChange={setSearchText}
    >
      {error ? (
        <List.Item
          title="History Unavailable"
          subtitle={error}
          icon={Icon.ExclamationMark}
          actions={<HistoryActions filters={filters} setFilters={setFilters} />}
        />
      ) : null}
      {!error && visibleItems.length === 0 && !isLoading ? (
        <List.Item
          title="No History Results"
          subtitle="Try a different filter or load a larger batch."
          icon={Icon.MagnifyingGlass}
          actions={<HistoryActions filters={filters} setFilters={setFilters} />}
        />
      ) : null}
      {visibleItems.map((item, index) => (
        <List.Item
          key={`${item.id}-${index}`}
          icon={historySourceIcon(item.source)}
          title={item.summary || `History Item #${item.id}`}
          subtitle={item.mode}
          accessories={[{ tag: `#${item.id}` }]}
          detail={
            <List.Item.Detail
              markdown={renderHistoryDetail(item)}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="ID"
                    text={`#${item.id}`}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Mode"
                    text={item.mode}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Source"
                    text={item.source}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Timestamp"
                    text={item.timestamp}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <HistoryActions
              filters={filters}
              setFilters={setFilters}
              tailChildren={
                <>
                  <Action.CopyToClipboard
                    title="Copy Text"
                    content={item.summary}
                  />
                  <Action.CopyToClipboard
                    title="Copy History ID"
                    content={item.id}
                  />
                </>
              }
            >
              <Action.Paste title="Paste" content={item.summary} />
              <Action.Push
                title="Reprocess"
                icon={Icon.ArrowClockwise}
                target={<ReprocessHistoryItemForm transcriptId={item.id} />}
              />
              <Action
                title="Delete"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => deleteHistoryItem(item, setItems)}
              />
            </HistoryActions>
          }
        />
      ))}
    </List>
  );
}

function ReplacementBrowser() {
  const [filters, setFilters] = useState<ReplacementFilters>(
    defaultReplacementFilters,
  );
  const [items, setItems] = useState<ReplacementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError("");

    async function loadReplacements() {
      try {
        const result = await runAimeFlux({
          label: "List Replacements",
          args: buildReplacementArgs(filters),
        });

        if (!active) {
          return;
        }

        if (result.exitCode !== 0) {
          throw new Error(
            result.stderr || result.stdout || "Failed to load replacements.",
          );
        }

        setItems(parseReplacementItems(result.stdout));
      } catch (loadError) {
        if (!active) {
          return;
        }

        const message =
          loadError instanceof Error ? loadError.message : String(loadError);
        setError(message);
        setItems([]);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load replacements",
          message,
        });
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadReplacements();

    return () => {
      active = false;
    };
  }, [filters]);

  const visibleItems = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) {
      return items;
    }

    return items.filter((item) =>
      [item.scopeTitle, item.scopeSubtitle, item.from, item.to].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [items, searchText]);

  async function removeReplacement(item: ReplacementItem) {
    const args = ["replacement", "remove"];

    if (item.scopeKey === "global") {
      args.push("--global");
    } else {
      args.push("--mode", item.scopeKey);
    }

    args.push("--from", item.from, "--to", item.to);

    const result = await executeRequest("Remove Replacement", {
      label: "Remove Replacement",
      args,
    });

    if (result?.exitCode !== 0) {
      return;
    }

    setItems((current) =>
      current.filter(
        (candidate) =>
          !(
            candidate.scopeKey === item.scopeKey &&
            candidate.from === item.from &&
            candidate.to === item.to
          ),
      ),
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="Replacements"
      searchBarPlaceholder="Filter loaded replacements..."
      onSearchTextChange={setSearchText}
    >
      {error ? (
        <List.Item
          title="Replacements Unavailable"
          subtitle={error}
          icon={Icon.ExclamationMark}
          actions={
            <ReplacementActions filters={filters} setFilters={setFilters} />
          }
        />
      ) : null}
      {!error && visibleItems.length === 0 && !isLoading ? (
        <List.Item
          title="No Replacements"
          subtitle="Try a different filter."
          icon={Icon.MagnifyingGlass}
          actions={
            <ReplacementActions filters={filters} setFilters={setFilters} />
          }
        />
      ) : null}
      {visibleItems.map((item, index) => (
        <List.Item
          key={`${item.scopeKey}-${item.from}-${index}`}
          icon={item.scopeKey === "global" ? Icon.Globe : Icon.Text}
          title={item.to}
          subtitle={item.from}
          accessories={[{ tag: item.scopeTitle }]}
          detail={
            <List.Item.Detail
              markdown={renderReplacementDetail(item)}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Scope"
                    text={item.scopeTitle}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Mode"
                    text={item.scopeSubtitle}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="From"
                    text={item.from}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="To" text={item.to} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ReplacementActions filters={filters} setFilters={setFilters}>
              <Action
                title="Remove Replacement"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => removeReplacement(item)}
              />
              <Action.CopyToClipboard title="Copy From" content={item.from} />
              <Action.CopyToClipboard title="Copy To" content={item.to} />
            </ReplacementActions>
          }
        />
      ))}
    </List>
  );
}

function WatchBrowser() {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = () => {
    setRefreshToken((current) => current + 1);
  };

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError("");

    async function loadWatches() {
      try {
        const result = await runAimeFlux({
          label: "List Watch Folders",
          args: ["watch", "list"],
        });

        if (!active) {
          return;
        }

        if (result.exitCode !== 0) {
          throw new Error(
            result.stderr || result.stdout || "Failed to load watch folders.",
          );
        }

        setItems(parseWatchItems(result.stdout));
      } catch (loadError) {
        if (!active) {
          return;
        }

        const message =
          loadError instanceof Error ? loadError.message : String(loadError);
        setError(message);
        setItems([]);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load watch folders",
          message,
        });
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadWatches();

    return () => {
      active = false;
    };
  }, [refreshToken]);

  const visibleItems = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) {
      return items;
    }

    return items.filter((item) =>
      [item.id, item.name, item.path, item.mode, item.model, item.formats].some(
        (value) => value.toLowerCase().includes(query),
      ),
    );
  }, [items, searchText]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="Watch Folders"
      searchBarPlaceholder="Filter loaded watch folders..."
      onSearchTextChange={setSearchText}
    >
      {error ? (
        <List.Item
          title="Watch Folders Unavailable"
          subtitle={error}
          icon={Icon.ExclamationMark}
          actions={<WatchActions onRefresh={refresh} />}
        />
      ) : null}
      {!error && visibleItems.length === 0 && !isLoading ? (
        <List.Item
          title="No Watch Folders"
          subtitle="Add a watch folder first."
          icon={Icon.Folder}
          actions={<WatchActions onRefresh={refresh} />}
        />
      ) : null}
      {visibleItems.map((item, index) => (
        <List.Item
          key={`${item.id}-${index}`}
          icon={item.enabled === "true" ? Icon.CheckCircle : Icon.XMarkCircle}
          title={item.name}
          subtitle={item.path}
          accessories={[
            { tag: item.enabled === "true" ? "Enabled" : "Disabled" },
          ]}
          detail={
            <List.Item.Detail
              markdown={renderWatchDetail(item)}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="ID" text={item.id} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Mode"
                    text={item.mode}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Model"
                    text={item.model}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.TagList title="LLM">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={item.llm === "true" ? "Yes" : "No"}
                    />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.TagList title="Includes Subfolders">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={item.subfolders === "true" ? "Yes" : "No"}
                    />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Formats"
                    text={item.formats}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Output"
                    text={item.output}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <WatchActions onRefresh={refresh}>
              <Action.Push
                title="Process This Folder"
                icon={Icon.ArrowClockwise}
                target={
                  <ExecutionView
                    title="Process This Folder"
                    request={{
                      label: "Process This Folder",
                      args: ["watch", "scan", item.id],
                    }}
                  />
                }
              />
              <Action
                title={
                  item.enabled === "true"
                    ? "Disable Processing"
                    : "Enable Processing"
                }
                icon={item.enabled === "true" ? Icon.Pause : Icon.Play}
                style={
                  item.enabled === "true"
                    ? Action.Style.Destructive
                    : Action.Style.Regular
                }
                onAction={() => toggleWatchProcessing(item, setItems)}
              />
              <Action.CopyToClipboard title="Copy Watch ID" content={item.id} />
              <Action.CopyToClipboard title="Copy Path" content={item.path} />
            </WatchActions>
          }
        />
      ))}
    </List>
  );
}

async function toggleWatchProcessing(
  item: WatchItem,
  setItems: Dispatch<SetStateAction<WatchItem[]>>,
) {
  const shouldDisable = item.enabled === "true";
  const action = shouldDisable ? "disable" : "enable";
  const result = await runAimeFlux({
    label: shouldDisable ? "Disable Processing" : "Enable Processing",
    args: ["watch", action, item.id],
  });

  if (result.exitCode !== 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: shouldDisable
        ? "Failed to disable processing"
        : "Failed to enable processing",
      message:
        firstMeaningfulLine(result.stderr || result.stdout) ||
        `Exit code: ${result.exitCode}`,
    });
    return;
  }

  setItems((current) =>
    current.map((candidate) =>
      candidate.id === item.id
        ? { ...candidate, enabled: shouldDisable ? "false" : "true" }
        : candidate,
    ),
  );

  await showToast({
    style: Toast.Style.Success,
    title: shouldDisable ? "Processing disabled" : "Processing enabled",
    message: item.name,
  });
}

async function removeInstalledModel(
  item: InstalledModelItem,
  setItems: Dispatch<SetStateAction<InstalledModelItem[]>>,
) {
  const result = await executeRequest("Delete Model", {
    label: "Delete Model",
    args: ["model", "remove", item.id],
  });

  if (result?.exitCode !== 0) {
    return;
  }

  setItems((current) =>
    current.filter((candidate) => candidate.id !== item.id),
  );
}

async function deleteHistoryItem(
  item: HistoryItem,
  setItems: Dispatch<SetStateAction<HistoryItem[]>>,
) {
  const result = await executeRequest("Delete History Item", {
    label: "Delete History Item",
    args: ["history", "delete", item.id],
  });

  if (result?.exitCode !== 0) {
    return;
  }

  setItems((current) =>
    current.filter((candidate) => candidate.id !== item.id),
  );
}

function PackageBrowser({ kind }: { kind: PackageKind }) {
  const [items, setItems] = useState<PackageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const label = kind === "rule-package" ? "Rule Packages" : "Mode Packages";

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError("");

    async function loadPackages() {
      try {
        const result = await runAimeFlux({
          label: `List ${label}`,
          args: [kind, "list"],
        });

        if (!active) {
          return;
        }

        if (result.exitCode !== 0) {
          throw new Error(
            result.stderr ||
              result.stdout ||
              `Failed to load ${label.toLowerCase()}.`,
          );
        }

        const parsedItems = parsePackageItems(kind, result.stdout);
        setItems(parsedItems);
        setIsLoading(false);

        void hydratePackageItems(kind, parsedItems).then((hydratedItems) => {
          if (!active) {
            return;
          }

          setItems(hydratedItems);
        });
      } catch (loadError) {
        if (!active) {
          return;
        }

        const message =
          loadError instanceof Error ? loadError.message : String(loadError);
        setError(message);
        setItems([]);
        await showToast({
          style: Toast.Style.Failure,
          title: `Failed to load ${label}`,
          message,
        });
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadPackages();

    return () => {
      active = false;
    };
  }, [kind, label]);

  const visibleItems = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) {
      return items;
    }

    return items.filter((item) =>
      [
        item.id,
        item.name,
        item.summary,
        item.record?.author ?? "",
        item.record?.description ?? "",
        item.record?.prompt ?? "",
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [items, searchText]);

  async function togglePackage(
    item: PackageItem,
    action: "enable" | "disable",
  ) {
    const result = await executeRequest(`${capitalize(action)} Package`, {
      label: `${capitalize(action)} Package`,
      args: [kind, action, item.id],
    });

    if (result?.exitCode !== 0) {
      return;
    }

    setItems((current) =>
      current.map((candidate) =>
        candidate.id === item.id
          ? {
              ...candidate,
              enabled: action === "enable",
              record: candidate.record
                ? { ...candidate.record, enabled: String(action === "enable") }
                : candidate.record,
            }
          : candidate,
      ),
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle={label}
      searchBarPlaceholder={`Filter loaded ${label.toLowerCase()}...`}
      onSearchTextChange={setSearchText}
    >
      {error ? (
        <List.Item
          title={`${label} Unavailable`}
          subtitle={error}
          icon={Icon.ExclamationMark}
        />
      ) : null}
      {!error && visibleItems.length === 0 && !isLoading ? (
        <List.Item
          title={`No ${label}`}
          subtitle={`No installed ${label.toLowerCase()}.`}
          icon={Icon.MagnifyingGlass}
        />
      ) : null}
      {visibleItems.map((item, index) => (
        <List.Item
          key={`${item.id}-${index}`}
          icon={item.enabled === false ? Icon.XMarkCircle : Icon.CheckCircle}
          title={item.name || item.id}
          subtitle={item.summary || item.id}
          accessories={[
            { tag: item.enabled === false ? "Disabled" : "Enabled" },
          ]}
          detail={
            <List.Item.Detail
              markdown={renderPackageDetail(item)}
              metadata={
                item.record ? (
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="ID"
                      text={item.record.id || item.id}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Author"
                      text={item.record.author || "Unknown"}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Version"
                      text={item.record.version || "Unknown"}
                    />
                    {item.record.language ? (
                      <>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label
                          title="Language"
                          text={item.record.language}
                        />
                      </>
                    ) : null}
                    {item.record.translate ? (
                      <>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.TagList title="Translate">
                          <List.Item.Detail.Metadata.TagList.Item
                            text={
                              item.record.translate === "true" ? "Yes" : "No"
                            }
                          />
                        </List.Item.Detail.Metadata.TagList>
                      </>
                    ) : null}
                  </List.Item.Detail.Metadata>
                ) : undefined
              }
            />
          }
          actions={
            <ActionPanel>
              {item.enabled === false ? (
                <Action
                  title="Enable Package"
                  icon={Icon.CheckCircle}
                  onAction={() => togglePackage(item, "enable")}
                />
              ) : (
                <Action
                  title="Disable Package"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  onAction={() => togglePackage(item, "disable")}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ReprocessHistoryItemForm({ transcriptId }: { transcriptId: string }) {
  const { push } = useNavigation();
  const [modeOptions, setModeOptions] = useState<Option[]>([]);
  const [isLoadingModes, setIsLoadingModes] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadModes() {
      try {
        const modes = await listModes();
        if (!active) {
          return;
        }
        setModeOptions(modes);
      } catch (error) {
        if (!active) {
          return;
        }
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load modes",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        if (active) {
          setIsLoadingModes(false);
        }
      }
    }

    loadModes();

    return () => {
      active = false;
    };
  }, []);

  async function submit(values: FormValues) {
    const args = ["reprocess", transcriptId];
    const mode = values.mode ? String(values.mode).trim() : "";
    const llm = values.llm ? String(values.llm).trim() : "original";

    if (mode) {
      args.push("--mode", mode);
    }
    args.push(
      "--mode-source",
      "current",
      "--replacement-source",
      "current",
      "--llm",
      llm,
    );

    push(
      <ExecutionView
        title="Reprocess Transcript"
        request={{
          label: "Reprocess Transcript",
          args,
        }}
      />,
    );
  }

  return (
    <Form
      isLoading={isLoadingModes}
      navigationTitle={`Reprocess #${transcriptId}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Command" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="mode" title="Mode" defaultValue="">
        <Form.Dropdown.Item value="" title="None" />
        {modeOptions.map((option, index) => (
          <Form.Dropdown.Item
            key={`reprocess-mode-${option.value}-${index}`}
            value={option.value}
            title={option.title}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="llm" title="LLM" defaultValue="original">
        {reprocessLlmOptions.map((option) => (
          <Form.Dropdown.Item
            key={`reprocess-llm-${option.value}`}
            value={option.value}
            title={option.title}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function ModeDetailView({ modeId }: { modeId: string }) {
  const [record, setRecord] = useState<ModeRecord>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError("");

    async function loadMode() {
      try {
        const exportedRecord = await loadModeRecord(modeId);
        if (!active) {
          return;
        }
        setRecord(exportedRecord);
      } catch (loadError) {
        if (!active) {
          return;
        }

        const message =
          loadError instanceof Error ? loadError.message : String(loadError);
        setError(message);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load mode",
          message,
        });
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadMode();

    return () => {
      active = false;
    };
  }, [modeId]);

  return (
    <Detail
      navigationTitle={record?.name || modeId}
      isLoading={isLoading}
      markdown={
        error ? `# Mode Unavailable\n\n${error}` : renderModeDetail(record)
      }
      metadata={
        record ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="ID" text={record.id} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Language" text={record.language} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.TagList title="Translate">
              <Detail.Metadata.TagList.Item
                text={record.translate === "true" ? "Yes" : "No"}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Vocabulary"
              text={record.vocabulary}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Replacements"
              text={record.replacements}
            />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          {record?.prompt ? (
            <Action.CopyToClipboard
              title="Copy Prompt"
              content={record.prompt}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

function CurrentModeView() {
  const modeSetOperation = operations.find(
    (candidate) => candidate.id === "mode-set",
  );
  const [record, setRecord] = useState<CurrentModeRecord>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError("");

    async function loadCurrentMode() {
      try {
        const result = await runAimeFlux({
          label: "Show Current Mode",
          args: ["mode", "current"],
        });

        if (!active) {
          return;
        }

        if (result.exitCode !== 0) {
          throw new Error(
            result.stderr ||
              result.stdout ||
              "Failed to load the current mode.",
          );
        }

        setRecord(parseCurrentModeRecord(result.stdout));
      } catch (loadError) {
        if (!active) {
          return;
        }

        const message =
          loadError instanceof Error ? loadError.message : String(loadError);
        setError(message);
        setRecord(undefined);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load current mode",
          message,
        });
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadCurrentMode();

    return () => {
      active = false;
    };
  }, [refreshToken]);

  return (
    <Detail
      navigationTitle="Current Mode"
      isLoading={isLoading}
      markdown={
        error
          ? `# Current Mode Unavailable\n\n${error}`
          : renderCurrentModeDetail(record)
      }
      metadata={
        record ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="ID" text={record.id} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Name" text={record.name} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.TagList title="Live Dictation Ready">
              <Detail.Metadata.TagList.Item
                text={record.live === "true" ? "Yes" : "No"}
              />
            </Detail.Metadata.TagList>
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          {modeSetOperation ? (
            <Action.Push
              title="Set Current Mode"
              icon={Icon.ArrowRight}
              target={<OperationForm operation={modeSetOperation} />}
            />
          ) : null}
          {record?.id ? (
            <Action.Push
              title="Inspect This Mode"
              icon={Icon.Eye}
              target={<ModeDetailView modeId={record.id} />}
            />
          ) : null}
          {record?.id ? (
            <Action.CopyToClipboard title="Copy Mode ID" content={record.id} />
          ) : null}
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={() => setRefreshToken((current) => current + 1)}
          />
        </ActionPanel>
      }
    />
  );
}

function ModelBrowser() {
  const [items, setItems] = useState<InstalledModelItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError("");

    async function loadInstalledModels() {
      try {
        const [modelResult, watchResult] = await Promise.all([
          runAimeFlux({
            label: "List Installed Models",
            args: ["model", "list"],
          }),
          runAimeFlux({
            label: "List Watch Folders",
            args: ["watch", "list"],
          }),
        ]);

        if (!active) {
          return;
        }

        if (modelResult.exitCode !== 0) {
          throw new Error(
            modelResult.stderr ||
              modelResult.stdout ||
              "Failed to load installed models.",
          );
        }

        const watchReferences =
          watchResult.exitCode === 0
            ? buildWatchModelReferences(parseWatchItems(watchResult.stdout))
            : new Map<string, string[]>();

        setItems(
          parseInstalledModels(modelResult.stdout).map((item) => ({
            ...item,
            watchReferences: watchReferences.get(item.id) ?? [],
          })),
        );
      } catch (loadError) {
        if (!active) {
          return;
        }

        const message =
          loadError instanceof Error ? loadError.message : String(loadError);
        setError(message);
        setItems([]);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load installed models",
          message,
        });
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadInstalledModels();

    return () => {
      active = false;
    };
  }, [refreshToken]);

  const visibleItems = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) {
      return items;
    }

    return items.filter((item) =>
      [item.id, item.name, item.size, item.watchReferences.join(" ")].some(
        (value) => value.toLowerCase().includes(query),
      ),
    );
  }, [items, searchText]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="Installed Models"
      searchBarPlaceholder="Filter installed models..."
      onSearchTextChange={setSearchText}
    >
      {error ? (
        <List.Item
          title="Installed Models Unavailable"
          subtitle={error}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={() => setRefreshToken((current) => current + 1)}
              />
            </ActionPanel>
          }
        />
      ) : null}
      {!error && visibleItems.length === 0 && !isLoading ? (
        <List.Item
          title="No Installed Models"
          subtitle="Install a Whisper model first."
          icon={Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={() => setRefreshToken((current) => current + 1)}
              />
            </ActionPanel>
          }
        />
      ) : null}
      {visibleItems.map((item, index) => {
        const canDelete = !item.current && item.watchReferences.length === 0;
        const accessories: List.Item.Accessory[] = [];
        if (item.current) {
          accessories.push({ tag: "Current" });
        }
        if (item.watchReferences.length > 0) {
          accessories.push({
            tag:
              item.watchReferences.length === 1
                ? "Used by Watch"
                : `Used by ${item.watchReferences.length} Watches`,
          });
        }

        return (
          <List.Item
            key={`${item.id}-${index}`}
            icon={item.current ? Icon.CheckCircle : Icon.Circle}
            title={item.name}
            subtitle={item.id}
            accessories={accessories}
            detail={
              <List.Item.Detail
                markdown={renderInstalledModelDetail(item)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="ID"
                      text={item.id}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Size"
                      text={item.size || "Unknown"}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.TagList title="Current">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={item.current ? "Yes" : "No"}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    {item.watchReferences.length > 0 ? (
                      <>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label
                          title="Used by Watch Folders"
                          text={item.watchReferences.join(", ")}
                        />
                      </>
                    ) : null}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                {canDelete ? (
                  <Action
                    title="Delete Model"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => removeInstalledModel(item, setItems)}
                  />
                ) : null}
                <Action.CopyToClipboard
                  title="Copy Model ID"
                  content={item.id}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={() => setRefreshToken((current) => current + 1)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function HistoryActions({
  filters,
  setFilters,
  children,
  tailChildren,
}: {
  filters: HistoryFilters;
  setFilters: Dispatch<SetStateAction<HistoryFilters>>;
  children?: ReactNode;
  tailChildren?: ReactNode;
}) {
  return (
    <ActionPanel>
      {children}
      <Action.Push
        title="Filter History"
        icon={Icon.Filter}
        target={<HistoryFilterForm filters={filters} onSubmit={setFilters} />}
      />
      {tailChildren}
      <Action
        title="Latest 20"
        icon={Icon.Clock}
        onAction={() => setFilters({ ...defaultHistoryFilters })}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={() => setFilters((current) => ({ ...current }))}
      />
    </ActionPanel>
  );
}

function ReplacementActions({
  filters,
  setFilters,
  children,
}: {
  filters: ReplacementFilters;
  setFilters: Dispatch<SetStateAction<ReplacementFilters>>;
  children?: ReactNode;
}) {
  return (
    <ActionPanel>
      <Action.Push
        title="Filter Replacements"
        icon={Icon.Filter}
        target={
          <ReplacementFilterForm filters={filters} onSubmit={setFilters} />
        }
      />
      <Action
        title="Show All"
        icon={Icon.List}
        onAction={() => setFilters({ ...defaultReplacementFilters })}
      />
      <Action
        title="Global Only"
        icon={Icon.Globe}
        onAction={() => setFilters({ globalOnly: true, mode: "" })}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={() => setFilters((current) => ({ ...current }))}
      />
      {children}
    </ActionPanel>
  );
}

function WatchActions({
  children,
  onRefresh,
}: {
  children?: ReactNode;
  onRefresh?: () => void;
}) {
  return (
    <ActionPanel>
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={() => onRefresh?.()}
      />
      {children}
    </ActionPanel>
  );
}

function ReplacementFilterForm({
  filters,
  onSubmit,
}: {
  filters: ReplacementFilters;
  onSubmit: Dispatch<SetStateAction<ReplacementFilters>>;
}) {
  const { pop } = useNavigation();
  const [modeOptions, setModeOptions] = useState<Option[]>([]);
  const [isLoadingModes, setIsLoadingModes] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadModes() {
      try {
        const modes = await listModes();
        if (active) {
          setModeOptions(modes);
        }
      } catch (error) {
        if (active) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to load modes",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      } finally {
        if (active) {
          setIsLoadingModes(false);
        }
      }
    }

    loadModes();

    return () => {
      active = false;
    };
  }, []);

  async function submit(values: FormValues) {
    onSubmit({
      globalOnly: values.globalOnly === true,
      mode: values.mode ? String(values.mode).trim() : "",
    });
    pop();
  }

  return (
    <Form
      isLoading={isLoadingModes}
      navigationTitle="Filter Replacements"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Apply Filters" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Checkbox
        id="globalOnly"
        label="Only Global Replacements"
        defaultValue={filters.globalOnly}
      />
      <Form.Dropdown id="mode" title="Mode" defaultValue={filters.mode}>
        <Form.Dropdown.Item value="" title="None" />
        {modeOptions.map((option, index) => (
          <Form.Dropdown.Item
            key={`replacement-mode-${option.value}-${index}`}
            value={option.value}
            title={option.title}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function HistoryFilterForm({
  filters,
  onSubmit,
}: {
  filters: HistoryFilters;
  onSubmit: Dispatch<SetStateAction<HistoryFilters>>;
}) {
  const { pop } = useNavigation();

  async function submit(values: FormValues) {
    onSubmit({
      limit: values.limit ? String(values.limit).trim() : "20",
      mode: filters.mode,
      query: values.query ? String(values.query).trim() : "",
      source: values.source ? String(values.source).trim() : "",
      range: buildHistoryRangeFromForm(values),
    });
    pop();
  }

  return (
    <Form
      navigationTitle="Filter History"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Apply Filters" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="limit"
        title="Result Count"
        defaultValue={filters.limit}
      >
        <Form.Dropdown.Item value="10" title="10" />
        <Form.Dropdown.Item value="20" title="20" />
        <Form.Dropdown.Item value="50" title="50" />
      </Form.Dropdown>
      <Form.TextField
        id="query"
        title="Search Query"
        placeholder="speaker correction"
        defaultValue={filters.query}
      />
      <Form.Dropdown id="source" title="Source" defaultValue={filters.source}>
        <Form.Dropdown.Item value="" title="None" />
        <Form.Dropdown.Item value="voice" title="Voice" />
        <Form.Dropdown.Item value="text" title="Text" />
        <Form.Dropdown.Item value="transcribe" title="Transcribe" />
      </Form.Dropdown>
      <Form.Dropdown
        id="rangePreset"
        title="Date Range Preset"
        defaultValue={historyRangePreset(filters.range)}
      >
        <Form.Dropdown.Item value="" title="Custom / None" />
        <Form.Dropdown.Item value="today" title="Today" />
        <Form.Dropdown.Item value="this_week" title="This Week" />
      </Form.Dropdown>
      <Form.DatePicker
        id="startDate"
        title="Start Date"
        type={Form.DatePicker.Type.Date}
        defaultValue={historyRangeStartDate(filters.range)}
      />
      <Form.DatePicker
        id="endDate"
        title="End Date"
        type={Form.DatePicker.Type.Date}
        defaultValue={historyRangeEndDate(filters.range)}
      />
    </Form>
  );
}

function buildHistoryArgs(filters: HistoryFilters) {
  const args = ["history", filters.limit || "20"];
  if (filters.mode) {
    args.push("--mode", filters.mode);
  }
  if (filters.query) {
    args.push("--q", filters.query);
  }
  if (filters.source) {
    args.push("--source", filters.source);
  }
  if (filters.range) {
    args.push("--range", filters.range);
  }
  return args;
}

function buildHistoryRangeFromForm(values: FormValues) {
  const preset = values.rangePreset ? String(values.rangePreset).trim() : "";
  if (preset === "today" || preset === "this_week") {
    return preset;
  }

  const start = values.startDate instanceof Date ? values.startDate : null;
  const end = values.endDate instanceof Date ? values.endDate : null;

  if (start && end) {
    return `${formatDateForCli(start)}/${formatDateForCli(end)}`;
  }

  if (start) {
    const day = formatDateForCli(start);
    return `${day}/${day}`;
  }

  if (end) {
    const day = formatDateForCli(end);
    return `${day}/${day}`;
  }

  return "";
}

function historyRangePreset(range: string) {
  return range === "today" || range === "this_week" ? range : "";
}

function historyRangeStartDate(range: string) {
  if (!range.includes("/")) {
    return null;
  }

  const [start] = range.split("/");
  return parseCliDate(start);
}

function historyRangeEndDate(range: string) {
  if (!range.includes("/")) {
    return null;
  }

  const [, end] = range.split("/");
  return parseCliDate(end);
}

function parseCliDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateForCli(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildReplacementArgs(filters: ReplacementFilters) {
  const args = ["replacement", "list"];
  if (filters.globalOnly) {
    args.push("--global");
  }
  if (filters.mode) {
    args.push("--mode", filters.mode);
  }
  return args;
}

async function loadLatestHistoryItem() {
  const result = await runAimeFlux({
    label: "Latest History Item",
    args: ["history", "1"],
  });

  if (result.exitCode !== 0) {
    throw new Error(
      result.stderr ||
        result.stdout ||
        "Failed to load the latest history item.",
    );
  }

  const item = parseHistoryItems(result.stdout).find(
    (candidate) => candidate.summary.trim().length > 0,
  );
  if (!item) {
    throw new Error("No history items are available.");
  }

  return item;
}

async function copyLatestHistoryItem() {
  try {
    const item = await loadLatestHistoryItem();
    await Clipboard.copy(item.summary);
    await showHUD("Latest history item copied", {
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to copy latest history item",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function toggleGlobalLlmCleanup() {
  const before = await getGlobalLlmCleanupStatus();
  const result = await executeRequest("Toggle LLM Cleanup", {
    label: "Toggle LLM Cleanup",
    args: ["cleanup", "toggle"],
  });

  if (result?.exitCode !== 0) {
    throw new Error(
      result?.stderr || result?.stdout || "Failed to toggle LLM cleanup.",
    );
  }

  const after = await getGlobalLlmCleanupStatus();
  const effectiveStatus =
    after ?? (before === "on" ? "off" : before === "off" ? "on" : "unknown");

  if (effectiveStatus === "on") {
    return "LLM cleanup enabled";
  }

  if (effectiveStatus === "off") {
    return "LLM cleanup disabled";
  }

  return "LLM cleanup toggled";
}

async function getGlobalLlmCleanupStatus() {
  const result = await runAimeFlux({
    label: "LLM Cleanup Status",
    args: ["cleanup", "status"],
  });

  if (result.exitCode !== 0) {
    throw new Error(
      result.stderr || result.stdout || "Failed to read LLM cleanup status.",
    );
  }

  const text = `${result.stdout}\n${result.stderr}`.trim().toLowerCase();
  if (/\b(on|enabled|true|yes)\b/.test(text)) {
    return "on";
  }

  if (/\b(off|disabled|false|no)\b/.test(text)) {
    return "off";
  }

  return undefined;
}

async function pasteLatestHistoryItem() {
  try {
    const item = await loadLatestHistoryItem();
    await closeMainWindow({
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });
    await Clipboard.paste(item.summary);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to paste latest history item",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function closeToRootAndShowHUD(message: string) {
  await closeMainWindow({
    clearRootSearch: true,
    popToRootType: PopToRootType.Immediate,
  });
  await showHUD(message, {
    clearRootSearch: true,
    popToRootType: PopToRootType.Immediate,
  });
}

function parseReplacementItems(output: string): ReplacementItem[] {
  const items: ReplacementItem[] = [];
  let scopeKey = "global";
  let scopeTitle = "Global";
  let scopeSubtitle = "Global replacements";

  for (const rawLine of output.split("\n")) {
    const line = rawLine.trim();
    if (!line || line === "(none)" || /^\d{4}\//.test(line)) {
      continue;
    }

    if (line === "global:") {
      scopeKey = "global";
      scopeTitle = "Global";
      scopeSubtitle = "Global replacements";
      continue;
    }

    const modeHeader = line.match(/^mode\s+([^\s]+)\s+\((.+)\):$/);
    if (modeHeader) {
      scopeKey = modeHeader[1];
      scopeTitle = modeHeader[2];
      scopeSubtitle = modeHeader[1];
      continue;
    }

    const replacementMatch = line.match(/^\d+\.\s+"(.+)"\s+->\s+"(.+)"$/);
    if (replacementMatch) {
      items.push({
        scopeKey,
        scopeTitle,
        scopeSubtitle,
        from: replacementMatch[1],
        to: replacementMatch[2],
      });
    }
  }

  return items;
}

function parseWatchItems(output: string): WatchItem[] {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/^\d{4}\//.test(line))
    .map((line) => {
      const columns = line
        .split("\t")
        .map((part) => part.trim())
        .filter(Boolean);
      const id = columns[0] ?? "";
      const name = columns[1] ?? id;
      const attributes = columns.slice(2);
      const path = attributes.find((part) => !part.includes("=")) ?? "";
      const kv = Object.fromEntries(
        attributes
          .filter((part) => part.includes("="))
          .map((part) => {
            const [key, ...rest] = part.split("=");
            return [key, rest.join("=")];
          }),
      );

      return {
        id,
        name,
        path,
        enabled: kv.enabled ?? "false",
        subfolders: kv.subfolders ?? "false",
        mode: kv.mode ?? "",
        model: kv.model ?? "",
        llm: kv.llm ?? "false",
        formats: kv.formats ?? "",
        output: kv.out ?? "",
        raw: line,
      };
    });
}

function buildWatchModelReferences(items: WatchItem[]) {
  const references = new Map<string, string[]>();

  for (const item of items) {
    if (!item.model) {
      continue;
    }

    const current = references.get(item.model) ?? [];
    current.push(item.name || item.id);
    references.set(item.model, current);
  }

  return references;
}

function parsePackageItems(kind: PackageKind, output: string): PackageItem[] {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) => line && !/^\d{4}\//.test(line) && !/^No installed /i.test(line),
    )
    .map((line) => {
      const columns = line.includes("\t")
        ? line.split("\t")
        : line.split(/\s{2,}/);
      const id = columns[0]?.trim() ?? line;
      const name = columns[1]?.trim() ?? id;
      const statusToken = columns
        .find((part) => /^(enabled|disabled)$/i.test(part.trim()))
        ?.trim()
        .toLowerCase();
      const summary = columns
        .slice(2)
        .map((part) => part.trim())
        .filter((part) => part && !/^(enabled|disabled)$/i.test(part))
        .join(" ");

      return {
        id,
        name,
        enabled: statusToken ? statusToken === "enabled" : null,
        summary,
        kind,
      };
    });
}

async function hydratePackageItems(kind: PackageKind, items: PackageItem[]) {
  return await Promise.all(
    items.map(async (item) => {
      try {
        const detailResult = await runAimeFlux({
          label: `Show ${item.name || item.id}`,
          args: [kind, "show", item.id],
        });

        if (detailResult.exitCode !== 0) {
          return item;
        }

        const record = parsePackageRecord(detailResult.stdout);
        return {
          ...item,
          name: record.name || item.name,
          enabled: record.enabled ? record.enabled === "true" : item.enabled,
          record,
        };
      } catch {
        return item;
      }
    }),
  );
}

function parseModeRecord(output: string): ModeRecord {
  const record: ModeRecord = {
    id: "",
    name: "",
    language: "",
    translate: "",
    prompt: "",
    vocabulary: "",
    vocabularyEntries: [],
    replacements: "",
    replacementEntries: [],
    appBindings: "",
    raw: output,
  };

  for (const rawLine of output.split("\n")) {
    const line = rawLine.trim();
    if (!line || /^\d{4}\//.test(line)) {
      continue;
    }

    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) {
      continue;
    }

    const key = match[1].trim();
    const value = match[2].trim().replace(/^"|"$/g, "");

    switch (key) {
      case "id":
        record.id = value;
        break;
      case "name":
        record.name = value;
        break;
      case "language":
        record.language = value;
        break;
      case "translate":
        record.translate = value;
        break;
      case "prompt":
        record.prompt = value;
        break;
      case "vocabulary":
        record.vocabulary = value;
        break;
      case "replacements":
        record.replacements = value;
        break;
      case "app_bindings":
        record.appBindings = value;
        break;
      default:
        break;
    }
  }

  return record;
}

async function loadModeRecord(modeId: string) {
  const tempPath = join(tmpdir(), `aimeflux-mode-${modeId}-${Date.now()}.json`);

  try {
    const exportResult = await runAimeFlux({
      label: "Export Mode",
      args: [
        "mode-package",
        "export",
        "--mode",
        modeId,
        "--name",
        "Raycast Temp",
        "--out",
        tempPath,
      ],
    });

    if (exportResult.exitCode === 0) {
      const exported = JSON.parse(await readFile(tempPath, "utf8")) as {
        package?: {
          mode?: {
            id?: string;
            name?: string;
            language?: string;
            translate?: boolean;
            prompt?: string;
            vocabulary?: string[];
            replacements?: Array<{ from: string; to: string }>;
            apps?: Array<{ name?: string }>;
          };
        };
      };

      const mode = exported.package?.mode;
      if (mode) {
        return {
          id: mode.id ?? modeId,
          name: mode.name ?? modeId,
          language: mode.language ?? "",
          translate: String(mode.translate ?? false),
          prompt: mode.prompt ?? "",
          vocabulary: `${mode.vocabulary?.length ?? 0} entries`,
          vocabularyEntries: mode.vocabulary ?? [],
          replacements: `${mode.replacements?.length ?? 0}`,
          replacementEntries: mode.replacements ?? [],
          appBindings: `${mode.apps?.length ?? 0}`,
          raw: JSON.stringify(exported, null, 2),
        } satisfies ModeRecord;
      }
    }
  } catch {
    // Fall through to the regular show command.
  } finally {
    await unlink(tempPath).catch(() => undefined);
  }

  const result = await runAimeFlux({
    label: "Show Mode",
    args: ["mode", "show", modeId],
  });

  if (result.exitCode !== 0) {
    throw new Error(result.stderr || result.stdout || "Failed to load mode.");
  }

  const record = parseModeRecord(result.stdout);
  const replacementResult = await runAimeFlux({
    label: "List Replacements",
    args: ["replacement", "list", "--mode", modeId],
  });

  if (replacementResult.exitCode === 0) {
    record.replacementEntries = parseModeReplacementEntries(
      replacementResult.stdout,
    );
  }

  return record;
}

function parseModeReplacementEntries(output: string) {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.match(/^\d+\.\s+"(.+)"\s+->\s+"(.+)"$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => ({ from: match[1], to: match[2] }));
}

function historySourceIcon(source: string) {
  switch (source) {
    case "voice":
      return Icon.Microphone;
    case "text":
      return Icon.Text;
    case "transcribe":
      return Icon.Document;
    default:
      return Icon.List;
  }
}

function renderReplacementDetail(item: ReplacementItem) {
  return [
    `# ${item.to}`,
    "",
    `From: \`${item.from}\``,
    "",
    `Scope: ${item.scopeTitle}`,
    `Mode ID: ${item.scopeSubtitle}`,
  ].join("\n");
}

function renderWatchDetail(item: WatchItem) {
  return [
    `# ${item.name}`,
    "",
    "## Folder",
    "",
    item.path ? `\`${item.path}\`` : "_No path available._",
  ].join("\n");
}

function renderInstalledModelDetail(item: InstalledModelItem) {
  const parts = [`# ${item.name}`, ""];

  parts.push(`- ID: \`${item.id}\``);
  parts.push(`- Size: ${item.size || "Unknown"}`);
  parts.push(`- Current: ${item.current ? "Yes" : "No"}`);

  if (item.watchReferences.length > 0) {
    parts.push("");
    parts.push("## Watch Folder Usage", "");
    for (const reference of item.watchReferences) {
      parts.push(`- ${reference}`);
    }
  } else {
    parts.push("");
    parts.push(
      item.current
        ? "_This model is active now and should not be deleted._"
        : "_No watch folder references detected._",
    );
  }

  return parts.join("\n");
}

function renderPackageDetail(item: PackageItem) {
  const record = item.record;
  if (!record) {
    return `# ${item.name || item.id}\n\n_Loading package details..._`;
  }

  const parts = [`# ${record.name || item.name || item.id}`];

  if (record.description) {
    parts.push("", record.description);
  }

  parts.push("", "## Rules");

  if (record.prompt) {
    parts.push("", "### Prompt", "", `\`\`\`text\n${record.prompt}\n\`\`\``);
  }

  if (record.language) {
    parts.push("", `- Language: ${record.language}`);
  }

  if (record.translate) {
    parts.push(`- Translate: ${record.translate}`);
  }

  if (record.vocabulary) {
    parts.push(`- Vocabulary: ${record.vocabulary}`);
  }

  if (record.replacements) {
    parts.push(`- Replacements: ${record.replacements}`);
  }

  if (record.appBindings) {
    parts.push(`- App Bindings: ${record.appBindings}`);
  }

  if (record.modeName || record.modeId) {
    parts.push("", "## Mode", "");
    if (record.modeName) {
      parts.push(`- Name: ${record.modeName}`);
    }
    if (record.modeId) {
      parts.push(`- ID: ${record.modeId}`);
    }
  }

  const extraEntries = Object.entries(record.metadata).filter(
    ([key]) =>
      ![
        "id",
        "name",
        "author",
        "version",
        "description",
        "enabled",
        "mode_id",
        "mode_name",
        "language",
        "translate",
        "prompt",
        "vocabulary",
        "replacements",
        "app_bindings",
      ].includes(key),
  );

  if (extraEntries.length > 0) {
    parts.push("", "## Metadata", "");
    for (const [key, value] of extraEntries) {
      parts.push(`- ${humanizeKey(key)}: ${value}`);
    }
  }

  return parts.join("\n");
}

function renderCurrentModeDetail(record?: CurrentModeRecord) {
  if (!record) {
    return "# Current Mode\n\n_Loading current mode..._";
  }

  return [
    `# ${record.name || record.id || "Current Mode"}`,
    "",
    `- ID: \`${record.id || "unknown"}\``,
    `- Live Dictation Ready: ${record.live === "true" ? "Yes" : "No"}`,
    "",
    "Use `Set Current Mode` to switch the active manual mode.",
  ].join("\n");
}

function renderModeDetail(record?: ModeRecord) {
  if (!record) {
    return "# Loading Mode";
  }

  const parts = [`# ${record.name || record.id}`];

  if (record.prompt) {
    parts.push("", "## Prompt", "", `\`\`\`text\n${record.prompt}\n\`\`\``);
  }

  if (record.vocabularyEntries.length > 0 || record.vocabulary) {
    parts.push("", "## Vocabulary", "");
    if (record.vocabularyEntries.length > 0) {
      for (const entry of record.vocabularyEntries) {
        parts.push(`- ${entry}`);
      }
    } else {
      parts.push(record.vocabulary);
    }
  }

  if (record.replacementEntries.length > 0 || record.replacements) {
    parts.push("", "## Replacements", "");
    if (record.replacementEntries.length > 0) {
      for (const entry of record.replacementEntries) {
        parts.push(`- \`${entry.from}\` -> \`${entry.to}\``);
      }
    } else {
      parts.push(record.replacements);
    }
  }

  return parts.join("\n");
}

function renderHistoryDetail(item: HistoryItem) {
  const content =
    item.summary || "_No text available from the current CLI history output._";
  return [`# History Item #${item.id}`, "", content].join("\n");
}

function humanizeKey(value: string) {
  return value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function ExecutionView({
  title,
  request,
}: {
  title: string;
  request: CommandRequest;
}) {
  const [state, setState] = useState<ExecutionState>({ isLoading: true });

  useEffect(() => {
    let active = true;

    async function execute() {
      try {
        const result = await executeRequest(title, request);
        if (!active) {
          return;
        }

        if (!result) {
          return;
        }

        setState({
          isLoading: false,
          result,
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setState({
          isLoading: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    execute();

    return () => {
      active = false;
    };
  }, [request, title]);

  const markdown = useMemo(() => renderMarkdown(title, state), [title, state]);
  const hasFailed =
    state.result?.exitCode !== undefined && state.result.exitCode !== 0;
  const primaryCopyTitle = hasFailed
    ? state.result?.stderr
      ? "Copy Error Output"
      : "Copy Result Output"
    : "Copy Result";
  const primaryCopyContent = hasFailed
    ? (state.result?.stderr ?? state.result?.stdout ?? "")
    : (state.result?.stdout ?? "");
  const shouldPasteResult = !hasFailed && shouldPasteResultByDefault(request);
  const importHistoryId = useMemo(
    () =>
      isImportTextRequest(request)
        ? parseImportedHistoryId(
            [state.result?.stdout, state.result?.stderr]
              .filter(Boolean)
              .join("\n"),
          )
        : undefined,
    [request, state.result?.stderr, state.result?.stdout],
  );

  return (
    <Detail
      navigationTitle={title}
      isLoading={state.isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {shouldPasteResult ? (
            <Action.Paste title="Paste Result" content={primaryCopyContent} />
          ) : null}
          <Action.CopyToClipboard
            title={primaryCopyTitle}
            content={primaryCopyContent}
          />
          {importHistoryId ? (
            <Action.CopyToClipboard title="Copy ID" content={importHistoryId} />
          ) : null}
          {state.result?.stdout && hasFailed && state.result?.stderr ? (
            <Action.CopyToClipboard
              title="Copy Standard Output"
              content={state.result.stdout}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

function shouldPasteResultByDefault(request: CommandRequest) {
  return isProcessRequest(request) || isImportTextRequest(request);
}

function isProcessRequest(request: CommandRequest) {
  return request.args[0] === "process";
}

function isImportTextRequest(request: CommandRequest) {
  return request.args[0] === "import-text";
}

async function executeRequest(title: string, request: CommandRequest) {
  try {
    const importBaselineIds = shouldTrackImportHistory(request)
      ? await getRelevantHistoryBaselineIds(request)
      : undefined;
    let result = await runAimeFlux(request);

    if (
      shouldTreatImportBusyAsSuccess(request, result) &&
      (await verifyImportedHistoryItem(request, importBaselineIds))
    ) {
      result = {
        ...result,
        exitCode: 0,
        stderr: "",
      };
    }

    if (result.exitCode === 0 && isImportTextRequest(request)) {
      result = {
        ...result,
        stdout: stripImportedHistoryHeader(result.stdout),
      };
    }

    const failureMessage =
      firstMeaningfulLine(result.stderr) ||
      firstMeaningfulLine(result.stdout) ||
      `Exit code: ${result.exitCode}`;
    await showToast({
      style: result.exitCode === 0 ? Toast.Style.Success : Toast.Style.Failure,
      title: result.detached
        ? `${title} started`
        : result.exitCode === 0
          ? `${title} finished`
          : `${title} failed`,
      message: result.detached
        ? "Process launched in the background."
        : result.exitCode === 0
          ? `Exit code: ${result.exitCode}`
          : failureMessage,
    });
    return result;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Failed to run ${title}`,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

function firstMeaningfulLine(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
}

function shouldTreatImportBusyAsSuccess(
  request: CommandRequest,
  result: { exitCode: number; stdout: string; stderr: string },
) {
  if (!isImportTextRequest(request) || result.exitCode === 0) {
    return false;
  }

  const message = `${result.stderr}\n${result.stdout}`;
  return /history write failed|database is locked|SQLITE_BUSY/i.test(message);
}

function shouldTrackImportHistory(request: CommandRequest) {
  return isImportTextRequest(request);
}

async function getRelevantHistoryBaselineIds(request: CommandRequest) {
  const verificationResult = await runAimeFlux({
    label: "Get Latest Relevant History Item",
    args: buildImportHistoryCheckArgs(
      request,
      String(IMPORT_HISTORY_CHECK_LIMIT),
    ),
  });

  if (verificationResult.exitCode !== 0) {
    return [];
  }

  return parseHistoryItems(verificationResult.stdout)
    .map((item) => item.id)
    .filter(Boolean);
}

async function verifyImportedHistoryItem(
  request: CommandRequest,
  baselineIds: string[] = [],
) {
  const importedText = request.args[1]?.trim();
  if (!importedText) {
    return false;
  }

  const verificationResult = await runAimeFlux({
    label: "Verify Imported History Item",
    args: buildImportHistoryCheckArgs(
      request,
      String(IMPORT_HISTORY_CHECK_LIMIT),
    ),
  });

  if (verificationResult.exitCode !== 0) {
    return false;
  }

  return importedHistoryItemWasCreated(
    importedText,
    parseHistoryItems(verificationResult.stdout),
    baselineIds,
  );
}

function buildImportHistoryCheckArgs(request: CommandRequest, limit: string) {
  const args = ["history", limit, "--source", "text"];
  const modeIndex = request.args.findIndex((arg) => arg === "--mode");
  if (modeIndex >= 0 && request.args[modeIndex + 1]) {
    args.push("--mode", request.args[modeIndex + 1]);
  }
  return args;
}

function renderMarkdown(title: string, state: ExecutionState) {
  if (state.error) {
    return `# ${title}\n\n## Error\n\n\`\`\`text\n${state.error}\n\`\`\``;
  }

  if (!state.result) {
    return `# ${title}\n\nRunning command...`;
  }

  const parts = [`# ${title}`];

  if (state.result.detached) {
    parts.push("## Status", "Process launched in the background.");
    return parts.join("\n\n");
  }

  if (state.result.stdout) {
    parts.push("## Result", state.result.stdout);
  }

  if (state.result.exitCode !== 0 && state.result.stderr) {
    parts.push("## Error", `\`\`\`text\n${state.result.stderr}\n\`\`\``);
  }

  if (
    state.result.exitCode === 0 &&
    !state.result.stdout &&
    !state.result.detached
  ) {
    parts.push("## Result", "_No output._");
  }

  return parts.join("\n\n");
}
