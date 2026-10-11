import { Action, ActionPanel, Icon, List, type LaunchProps } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState } from "react";
import { FileActions } from "./components/file-actions";
import { FileDetail } from "./components/file-detail";
import { StatusView } from "./components/status-view";
import { search, type Hit } from "./lib/fsearch";
import { expandHome, fileName, folderOf, formatDate, modifiedDate, pluralize, tildify } from "./lib/format";
import { filtersFor, KINDS } from "./lib/kinds";
import { useFSearch } from "./lib/use-fsearch";

const LIMIT = 60;

export default function Command({ arguments: args, fallbackText }: LaunchProps<{ arguments: Arguments.SearchFiles }>) {
  const [text, setText] = useState(args.query || fallbackText || "");
  const [kind, setKind] = useState<string>(args.kind || "all");
  const [scope, setScope] = useState<string | undefined>(args.folder?.trim() ? expandHome(args.folder) : undefined);
  const [isShowingDetail, setShowingDetail] = useCachedState("show-detail", false);

  // A kind or folder is enough to list something, even with no words.
  const query = text.trim();
  const execute = query.length > 0 || kind !== "all" || scope !== undefined;
  const filters = { ...filtersFor(kind), ...(scope ? { in: scope } : {}) };

  const { data, isLoading, error, indexing, revalidate } = useFSearch(
    (signal, q: string, f: typeof filters) => search(q, f, LIMIT, signal),
    [query, filters],
    execute,
  );

  const hits = execute && !error ? (data?.hits ?? []) : [];
  const toggleDetail = () => setShowingDetail((shown) => !shown);
  const scopeTitle = scope ? fileName(scope) : undefined;

  return (
    <List
      isLoading={isLoading || indexing}
      filtering={false}
      searchText={text}
      onSearchTextChange={setText}
      searchBarPlaceholder={scopeTitle ? `Search in ${scopeTitle}` : "Search your Mac"}
      navigationTitle={scopeTitle ? `Search Files in ${scopeTitle}` : undefined}
      isShowingDetail={isShowingDetail && hits.length > 0}
      searchBarAccessory={
        // A kind chosen in root search wins over the one remembered from last time.
        <List.Dropdown
          tooltip="Kind"
          {...(args.kind ? { defaultValue: args.kind } : { storeValue: true })}
          onChange={setKind}
        >
          {KINDS.map((k) => (
            <List.Dropdown.Item key={k.value} value={k.value} title={k.title} />
          ))}
        </List.Dropdown>
      }
    >
      {!execute ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search Your Mac"
          description={
            "Type part of a name. Typos are fine.\nNarrow it with in:~/Developer, ext:pdf, size:>5mb, or mtime:<7d."
          }
        />
      ) : error ? (
        <StatusView error={error} onRetry={revalidate} />
      ) : (
        <>
          <List.EmptyView
            icon={Icon.MagnifyingGlass}
            title={isLoading ? "Searching…" : "No Results"}
            description={scope ? `Nothing in ${tildify(scope)} matches.` : undefined}
            actions={scope ? <ScopeActions onClear={() => setScope(undefined)} /> : undefined}
          />
          <List.Section title={scope ? tildify(scope) : "Results"} subtitle={pluralize(hits.length, "result")}>
            {hits.map((hit) => (
              <HitItem
                key={hit.path}
                hit={hit}
                isShowingDetail={isShowingDetail}
                onToggleDetail={toggleDetail}
                onSearchIn={setScope}
                scope={scope}
                onClearScope={() => setScope(undefined)}
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

interface HitItemProps {
  hit: Hit;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
  onSearchIn: (folder: string) => void;
  scope?: string;
  onClearScope: () => void;
}

function HitItem({ hit, isShowingDetail, onToggleDetail, onSearchIn, scope, onClearScope }: HitItemProps) {
  const name = fileName(hit.path);
  const modified = modifiedDate(hit.mtime);
  return (
    <List.Item
      id={hit.path}
      icon={{ fileIcon: hit.path }}
      title={name}
      subtitle={isShowingDetail ? undefined : folderOf(hit.path)}
      keywords={[hit.path]}
      quickLook={{ path: hit.path, name }}
      accessories={
        isShowingDetail || !modified ? undefined : [{ date: modified, tooltip: `Modified ${formatDate(modified)}` }]
      }
      detail={isShowingDetail ? <FileDetail hit={hit} /> : undefined}
      actions={
        <FileActions
          path={hit.path}
          isFolder={hit.kind === "dir" && !hit.path.endsWith(".app")}
          onSearchIn={onSearchIn}
          onToggleDetail={onToggleDetail}
          isShowingDetail={isShowingDetail}
        >
          {scope && <ScopeActions onClear={onClearScope} />}
        </FileActions>
      }
    />
  );
}

function ScopeActions({ onClear }: { onClear: () => void }) {
  return (
    <ActionPanel.Section>
      <Action
        title="Search Everywhere"
        icon={Icon.Globe}
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
        onAction={onClear}
      />
    </ActionPanel.Section>
  );
}
