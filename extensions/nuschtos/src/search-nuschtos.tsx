import {
  Action,
  ActionPanel,
  Detail,
  environment,
  getPreferenceValues,
  Icon,
  List,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";
import fetch, { AbortError } from "node-fetch";
import { exec } from "node:child_process";
import { useCallback, useEffect, useRef, useState } from "react";
import TurndownService from "turndown";
import { CliMetaResult, Scope } from "./refresh-index";

export default function Command() {
  const [scopes, setScopes] = useState<Scope[]>([]);
  const { state, search, onScopeChange, setIsInDetailView } = useSearch();
  const { showDetailInList } = getPreferenceValues();

  // Load scopes on component mount
  useEffect(() => {
    async function loadScopes() {
      const storedMeta = await LocalStorage.getItem("cliMetaResult");
      if (storedMeta) {
        const meta = JSON.parse(storedMeta as string) as CliMetaResult;
        setScopes(meta.scopes);
      }
    }
    loadScopes();
  }, []);

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={(text) => search(text, state.selectedScope)}
      searchBarPlaceholder="Search nix options..."
      throttle
      filtering={false}
      isShowingDetail={showDetailInList}
      searchBarAccessory={<ScopeDropdown scopes={scopes} onScopeChange={onScopeChange} />}
    >
      <List.Section title="Results" subtitle={state.results.length + ""}>
        {state.results.map((searchResult) => (
          <SearchListItem key={searchResult.name} searchResult={searchResult} setIsInDetailView={setIsInDetailView} />
        ))}
      </List.Section>
    </List>
  );
}

function ScopeDropdown(props: { scopes: Scope[]; onScopeChange: (newValue: string) => void }) {
  const { scopes, onScopeChange } = props;
  return (
    <List.Dropdown
      tooltip="Select Scope"
      storeValue={true}
      onChange={(newValue) => {
        onScopeChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Scopes">
        <List.Dropdown.Item title="All" value="-1" />
        {scopes.map((scope) => (
          <List.Dropdown.Item key={scope.id} title={scope.name} value={scope.id.toString()} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function SearchListItem({
  searchResult,
  setIsInDetailView,
}: {
  searchResult: SearchResult;
  setIsInDetailView: (value: boolean) => void;
}) {
  const td = new TurndownService();
  const declarations = searchResult.declarations.map((declaration) => `- ${td.turndown(declaration)}`).join("\n");
  const detailMarkdown = `# ${searchResult.name}\n${td.turndown(searchResult.description ?? "")}\n\nDeclarations:\n${declarations}`;
  const defaultText = td.turndown(searchResult.default).replaceAll("\\", "");
  const exampleText = td.turndown(searchResult.example ?? "").replaceAll("\\", "");

  return (
    <List.Item
      title={searchResult.name}
      subtitle={searchResult.scope}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Option Name" content={searchResult.name} />
            <Action.Push
              title="Show Details"
              icon={Icon.Eye}
              target={
                <Detail
                  markdown={detailMarkdown}
                  metadata={
                    <Detail.Metadata>
                      <Detail.Metadata.Label title="Name" text={searchResult.name} />
                      <Detail.Metadata.Label title="Scope" text={searchResult.scope} />
                      <Detail.Metadata.Separator />
                      <Detail.Metadata.Label title="Type" text={searchResult.type} />
                      <Detail.Metadata.Label title="Default" text={defaultText} />
                      <Detail.Metadata.Label title="Example" text={exampleText} />
                      <Detail.Metadata.Label title="Read Only" text={searchResult.read_only ? "Yes" : "No"} />
                    </Detail.Metadata>
                  }
                />
              }
              onPush={() => setIsInDetailView(true)}
              onPop={() => setIsInDetailView(false)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          markdown={detailMarkdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Name" text={searchResult.name} />
              <List.Item.Detail.Metadata.Label title="Scope" text={searchResult.scope} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Type" text={searchResult.type} />
              <List.Item.Detail.Metadata.Label title="Default" text={defaultText} />
              <List.Item.Detail.Metadata.Label title="Example" text={exampleText} />
              <List.Item.Detail.Metadata.Label title="Read Only" text={searchResult.read_only ? "Yes" : "No"} />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}

function useSearch() {
  const [state, setState] = useState<SearchState>({
    results: [],
    isLoading: false,
    selectedScope: null,
    searchText: "",
  });
  const cancelRef = useRef<AbortController | null>(null);
  const cliMetaResultRef = useRef<CliMetaResult | null>(null);

  // Move the search logic into a useEffect
  useEffect(() => {
    const controller = new AbortController();
    cancelRef.current = controller;

    async function performSearchRequest() {
      if (!state.searchText) {
        setState((prev) => ({ ...prev, isLoading: false, results: [] }));
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        if (!cliMetaResultRef.current) {
          const storedMeta = await LocalStorage.getItem("cliMetaResult");
          if (!storedMeta) {
            throw new Error("Meta results not found. Please refresh the index first.");
          }
          cliMetaResultRef.current = JSON.parse(storedMeta as string) as CliMetaResult;
        }

        const results = await performSearch(
          state.searchText,
          controller.signal,
          cliMetaResultRef.current,
          state.selectedScope,
        );

        setState((prev) => ({
          ...prev,
          results,
          isLoading: false,
        }));
      } catch (error) {
        if (error instanceof AbortError) {
          return;
        }

        setState((prev) => ({ ...prev, isLoading: false }));
        console.error("search error", error);
        showToast({
          style: Toast.Style.Failure,
          title:
            error instanceof Error && error.message.includes("Meta results")
              ? "Meta Results Not Found"
              : "Could not perform search",
          message: String(error),
        });
      }
    }

    performSearchRequest();

    return () => {
      controller.abort();
    };
  }, [state.searchText, state.selectedScope]);

  const search = useCallback((searchText: string, selectedScope: number | null) => {
    setState((prev) => ({
      ...prev,
      searchText,
      selectedScope,
    }));
  }, []);

  const onScopeChange = useCallback((newValue: string) => {
    const scopeId = newValue === "" ? null : parseInt(newValue);
    setState((prev) => ({
      ...prev,
      selectedScope: scopeId,
    }));
  }, []);

  return {
    state,
    search,
    onScopeChange,
    setIsInDetailView: () => {}, // We don't need this anymore
  };
}

function execCommand(command: string, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = exec(command, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });

    signal.addEventListener("abort", () => {
      child.kill();
      reject(new AbortError());
    });
  });
}

async function performSearch(
  searchText: string,
  signal: AbortSignal,
  cliMetaResult: CliMetaResult,
  selectedScope: number | null,
): Promise<SearchResult[]> {
  if (searchText.length === 0) return [];

  const { searchSize, ixxPath } = getPreferenceValues();

  try {
    const scopeArg = selectedScope !== null && selectedScope !== -1 ? ` -s ${selectedScope}` : "";
    const searchCommand = `${ixxPath} search -f json${scopeArg} -m ${searchSize} -i "${environment.supportPath}/index.ixx" "${searchText}"`;
    const cliResults: CliResult[] = JSON.parse(await execCommand(searchCommand, signal));

    const metadata = await fetchMeta(cliResults, cliMetaResult.chunk_size, signal);

    const results = cliResults.map((result) => {
      const pos = result.idx % cliMetaResult.chunk_size;
      const chunk = Math.floor((result.idx - pos) / cliMetaResult.chunk_size);
      const meta = metadata.get(chunk);
      const metaResult = meta?.[pos];

      return {
        id: String(result.idx),
        scope: cliMetaResult.scopes.find((scope) => scope.id === result.scope_id)?.name || "",
        name: metaResult?.name || result.name || "",
        description: metaResult?.description || null,
        declarations: metaResult?.declarations || [],
        default: metaResult?.default || "",
        example: metaResult?.example || null,
        read_only: metaResult?.read_only || false,
        type: metaResult?.type || "",
      };
    });

    return results;
  } catch (error) {
    console.error("Search failed:", error);
    return [];
  }
}

async function fetchMeta(
  results: CliResult[],
  chunkSize: number,
  signal: AbortSignal,
): Promise<Map<number, MetaResponse[]>> {
  // Group indices by their chunk number
  const chunks = new Set(results.map((result) => Math.floor((result.idx - (result.idx % chunkSize)) / chunkSize)));

  try {
    // Fetch all chunks in parallel
    const map = new Map<number, MetaResponse[]>();
    await Promise.all(
      Array.from(chunks).map(async (chunk) => {
        const response = await fetch(`https://search.nüschtos.de/meta/${chunk}.json`, { signal });
        const data = (await response.json()) as MetaResponse[];
        map.set(chunk, data);
      }),
    );

    // Combine all chunk responses into a single object
    return map;
  } catch (error) {
    console.error("Failed to fetch metadata:", error);
    return new Map();
  }
}

interface MetaResponse {
  declarations: string[];
  default: string;
  description: string | null;
  example: string | null;
  read_only: boolean;
  type: string;
  name: string;
}

interface CliResult {
  idx: number;
  scope_id: number;
  name: string;
}

interface SearchState {
  results: SearchResult[];
  isLoading: boolean;
  selectedScope: number | null;
  searchText: string;
}

interface SearchResult extends MetaResponse {
  id: string;
  scope: string;
}
