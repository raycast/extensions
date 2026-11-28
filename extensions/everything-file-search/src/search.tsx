import { useCallback, useEffect, useMemo, useState } from "react";
import { spawn } from "node:child_process";
import fs from "node:fs";
import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showHUD,
  showToast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  EverythingUnavailableError,
  searchEverything,
  type EverythingResponse,
  type SortField,
} from "./lib/everything.js";
import { iconForFile, type FileType } from "./lib/file-types.js";
import { buildTypeDefs, loadCustomTypes } from "./lib/file-types-store.js";
import {
  filetimeToDate,
  formatDateTime,
  formatNumber,
  formatSize,
} from "./lib/format.js";
import {
  previewMarkdown,
  fullPathOf,
  isTextPreviewable,
} from "./lib/preview.js";
import ManageTypesCommand from "./manage-types.js";
import {
  MANUAL_SETUP_GUIDE,
  detectEverything,
  ensureHttpServer,
  installEverythingAndEnableHttp,
  type EverythingStatus,
} from "./lib/setup.js";

const SORT_OPTIONS: {
  key: string;
  field: SortField;
  ascending: boolean;
  label: string;
  arrow: string;
}[] = [
  {
    key: "name-asc",
    field: "name",
    ascending: true,
    label: "Name",
    arrow: "↑",
  },
  {
    key: "name-desc",
    field: "name",
    ascending: false,
    label: "Name",
    arrow: "↓",
  },
  {
    key: "path-asc",
    field: "path",
    ascending: true,
    label: "Path",
    arrow: "↑",
  },
  {
    key: "path-desc",
    field: "path",
    ascending: false,
    label: "Path",
    arrow: "↓",
  },
  {
    key: "size-asc",
    field: "size",
    ascending: true,
    label: "Size",
    arrow: "↑",
  },
  {
    key: "size-desc",
    field: "size",
    ascending: false,
    label: "Size",
    arrow: "↓",
  },
  {
    key: "date_modified-asc",
    field: "date_modified",
    ascending: true,
    label: "Modified",
    arrow: "↑",
  },
  {
    key: "date_modified-desc",
    field: "date_modified",
    ascending: false,
    label: "Modified",
    arrow: "↓",
  },
];

function resultKey(f: EverythingResponse["results"][number]): string {
  return `${f.type}|${f.path}|${f.name}`;
}

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

function usePersistentState(
  key: string,
  initial: string,
): [string, (v: string) => void] {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    LocalStorage.getItem<string>(key).then((stored) => {
      if (stored !== undefined) setValue(stored);
    });
  }, [key]);
  const set = useCallback(
    (v: string) => {
      setValue(v);
      LocalStorage.setItem(key, v);
    },
    [key],
  );
  return [value, set];
}

// Preference and argument shapes come from the generated raycast-env.d.ts
export default function SearchCommand(props: { arguments?: Arguments.Search }) {
  const { push } = useNavigation();
  const prefs = getPreferenceValues<Preferences>();
  const host = prefs.host?.trim() || "127.0.0.1";
  const port = parseInt(prefs.port?.trim() || "8085", 10) || 8085;
  const maxResults = Math.min(
    Math.max(parseInt(prefs.maxResults?.trim() || "300", 10) || 300, 10),
    1000,
  );

  // Built-ins from preferences; custom types from LocalStorage (edited via Configure File Types),
  // polled so changes made in the other command show up without reopening this one.
  const [typeDefs, setTypeDefs] = useState(() => buildTypeDefs(prefs, []));
  const [customLoaded, setCustomLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    const load = () => {
      loadCustomTypes().then((custom) => {
        if (alive) {
          setTypeDefs(buildTypeDefs(prefs, custom));
          setCustomLoaded(true);
        }
      });
    };
    load();
    const timer = setInterval(load, 3000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const [query, setQuery] = useState(props.arguments?.query ?? "");
  const [typeId, setTypeId] = usePersistentState("everything.fileType", "all");
  const [sortKey, setSortKey] = usePersistentState(
    "everything.sort",
    "name-asc",
  );
  const [previewOn, setPreviewOn] = usePersistentState(
    "everything.preview",
    "true",
  );
  const [reloadTick, setReloadTick] = useState(0);
  // Text previews are read only for the selected row (List.onSelectionChange)
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const debouncedQuery = useDebounced(query, 250);
  const fileType = useMemo(
    () => typeDefs.find((t) => t.id === typeId) ?? typeDefs[0],
    [typeDefs, typeId],
  );
  const sort = SORT_OPTIONS.find((s) => s.key === sortKey) ?? SORT_OPTIONS[0];
  const showPreview = previewOn === "true";

  // Pagination: reset to first page and clear accumulated results when the query,
  // the type filter (including edits made to the active custom type) or the sort changes
  const [page, setPage] = useState(0);
  const [allResults, setAllResults] = useState<EverythingResponse["results"]>(
    [],
  );
  const [total, setTotal] = useState(0);

  // Stable signature of the active filter: the typeDefs array is re-created by
  // the 3s LocalStorage poll, so array identities would churn the fetch deps
  // and re-run the search on every poll — compare a serialized signature instead
  const typeSig = useMemo(
    () =>
      JSON.stringify({
        e: fileType?.onlyFolders ? undefined : fileType?.extensions,
        f: fileType?.onlyFolders ?? false,
      }),
    [fileType],
  );

  useEffect(() => {
    setPage(0);
    setAllResults([]);
  }, [debouncedQuery, typeSig, sortKey]);

  // A persisted custom type id can load before its definition does — hold the
  // search until the custom types arrive instead of briefly falling back to All
  const waitingForTypes =
    !customLoaded && typeId !== "all" && !typeDefs.some((t) => t.id === typeId);

  const skipFetch =
    !debouncedQuery.trim() && !fileType?.extensions && !fileType?.onlyFolders;
  const { isLoading, data, error } = usePromise(
    async (
      q: string,
      _sig: string,
      sortK: string,
      pageArg: number,
      _tick: number,
      waiting: boolean,
    ) => {
      if (waiting) return null;
      // The closure holds the latest typeDefs, so edits to the active custom
      // type apply as soon as the signature change re-triggers the fetch
      const ft = typeDefs.find((t) => t.id === typeId) ?? typeDefs[0];
      if (!q.trim() && !ft?.extensions && !ft?.onlyFolders) return null;
      const st = SORT_OPTIONS.find((s) => s.key === sortK) ?? SORT_OPTIONS[0];
      const resp = await searchEverything({
        host,
        port,
        query: q,
        extensions: ft?.onlyFolders ? undefined : ft?.extensions,
        onlyFolders: ft?.onlyFolders ?? false,
        onlyFiles: !ft?.onlyFolders && ft?.id !== "all" && !!ft?.extensions,
        sort: { field: st.field, ascending: st.ascending },
        count: maxResults,
        offset: pageArg * maxResults,
        timeoutMs: 6000,
      });
      return {
        page: pageArg,
        results: resp.results,
        totalResults: resp.totalResults,
      };
    },
    [debouncedQuery, typeSig, sortKey, page, reloadTick, waitingForTypes],
  );

  // Apply only the response that matches the current page — while the next page
  // is loading, usePromise still holds the previous response, and appending it
  // again would duplicate rows. Dedupe by file identity as a safety net.
  useEffect(() => {
    if (!data || data.page !== page) return;
    setTotal(data.totalResults);
    setAllResults((prev) => {
      if (data.page === 0 || prev.length === 0) return data.results;
      const seen = new Set(prev.map(resultKey));
      return [...prev, ...data.results.filter((f) => !seen.has(resultKey(f)))];
    });
  }, [data, page]);

  const results = allResults;
  const sortLabel = `${sort.label} ${sort.arrow}`;

  const onDropdownChange = (value: string) => {
    if (value.startsWith("type:")) {
      setTypeId(value.slice(5));
    } else if (value.startsWith("sort:")) {
      setSortKey(value.slice(5));
    } else if (value === "preview:toggle") {
      setPreviewOn(previewOn === "true" ? "false" : "true");
    } else if (value === "action:preferences") {
      openExtensionPreferences();
    } else if (value === "action:manage-types") {
      push(<ManageTypesCommand />);
    }
  };

  // Refresh re-fetches from the first page; without the reset the effect would
  // append the re-fetched page to the already accumulated rows (duplicates)
  const refresh = useCallback(() => {
    setPage(0);
    setAllResults([]);
    setReloadTick((t) => t + 1);
  }, []);

  // Alt+T: cycle the type filter (advertised in the README)
  const cycleType = useCallback(() => {
    const idx = typeDefs.findIndex((t) => t.id === typeId);
    const next = typeDefs[(idx + 1) % typeDefs.length] ?? typeDefs[0];
    if (next) setTypeId(next.id);
  }, [typeDefs, typeId, setTypeId]);

  const loadMore = useCallback(() => {
    setPage((p) => p + 1);
  }, []);

  const remaining = total - results.length;
  const loadInfo =
    remaining > 0
      ? ` · ${formatNumber(results.length)} loaded, Enter to load more`
      : "";

  return (
    <List
      isShowingDetail={showPreview}
      isLoading={isLoading || waitingForTypes}
      onSelectionChange={setSelectedId}
      searchText={query}
      onSearchTextChange={setQuery}
      enableFiltering={false}
      searchBarPlaceholder="Search files · type/sort/preview via the dropdown · Everything syntax supported (ext:pdf path:C:\\)"
      searchBarAccessory={
        <List.Dropdown
          tooltip="File type / sort / preview / settings"
          value={`type:${typeId}`}
          onChange={onDropdownChange}
        >
          <List.Dropdown.Section title="File Type">
            {typeDefs.map((t) => (
              <List.Dropdown.Item
                key={t.id}
                title={t.label}
                icon={t.icon}
                value={`type:${t.id}`}
              />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Sort By">
            {SORT_OPTIONS.map((s) => (
              <List.Dropdown.Item
                key={s.key}
                title={`${s.label} ${s.arrow}`}
                value={`sort:${s.key}`}
                icon={sortKey === s.key ? Icon.Checkmark : undefined}
              />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Preview">
            <List.Dropdown.Item
              title={
                showPreview
                  ? "Preview: on (click to turn off)"
                  : "Preview: off (click to turn on)"
              }
              value="preview:toggle"
              icon={showPreview ? Icon.Eye : Icon.EyeDisabled}
            />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Settings">
            <List.Dropdown.Item
              title="Add / edit custom types…"
              value="action:manage-types"
              icon={Icon.Pencil}
            />
            <List.Dropdown.Item
              title="Extension Preferences…"
              value="action:preferences"
              icon={Icon.Gear}
            />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {waitingForTypes ? (
        <List.EmptyView
          title="Loading type filters…"
          description="Restoring the saved custom type from local storage"
          icon={Icon.CircleProgress}
        />
      ) : skipFetch ? (
        <List.EmptyView
          title="Type to start searching"
          description={`Current type: ${fileType?.label ?? "All"} · switch type/sort/preview in the dropdown on the right of the search bar`}
          actions={
            <ActionPanel>
              <Action
                title="Next Type Filter"
                icon={Icon.Filter}
                shortcut={{ modifiers: ["opt"], key: "t" }}
                onAction={cycleType}
              />
              <SetupActions host={host} port={port} onRetry={refresh} />
            </ActionPanel>
          }
        />
      ) : error ? (
        <List.EmptyView
          title="Cannot connect to Everything"
          description={
            error instanceof EverythingUnavailableError
              ? `${error.message}. Use the actions below to install Everything or enable its HTTP server.`
              : "The Everything HTTP server is not enabled or the port doesn't match"
          }
          actions={
            <ActionPanel>
              <SetupActions host={host} port={port} onRetry={refresh} />
            </ActionPanel>
          }
        />
      ) : total === 0 && !isLoading ? (
        <List.EmptyView
          title="No matching files"
          description={`Query "${debouncedQuery}" · type ${fileType?.label ?? "All"} · try another keyword or switch to All`}
        />
      ) : (
        <List.Section
          title={`${fileType?.label ?? "All"} · ${formatNumber(total)} results${loadInfo} · sorted by ${sortLabel}`}
        >
          {results.map((f, i) => {
            const itemKey = `${f.type}|${f.path}\\${f.name}|${i}`;
            return (
              <FileListItem
                key={itemKey}
                id={itemKey}
                isSelected={selectedId === itemKey}
                file={f}
                typeDefs={typeDefs}
                onTogglePreview={() =>
                  setPreviewOn(previewOn === "true" ? "false" : "true")
                }
                onCycleType={cycleType}
                onRefresh={refresh}
                showPreview={showPreview}
              />
            );
          })}
          {remaining > 0 && (
            <List.Item
              icon={Icon.ChevronDown}
              title={`Load more (${formatNumber(results.length)} of ${formatNumber(total)} shown)`}
              subtitle={`${formatNumber(remaining)} more · press Enter to load the next batch`}
              actions={
                <ActionPanel>
                  <Action
                    title="Load More"
                    icon={Icon.ChevronDown}
                    onAction={loadMore}
                  />
                </ActionPanel>
              }
            />
          )}
        </List.Section>
      )}
    </List>
  );
}

function FileMetadata({
  file,
}: {
  file: EverythingResponse["results"][number];
}) {
  const dm = filetimeToDate(file.date_modified);
  const dc = filetimeToDate(file.date_created);
  const isFolder = file.type === "folder";
  const M = List.Item.Detail.Metadata;
  return (
    <M>
      <M.Label title="Name" text={file.name} />
      <M.Label title="Type" text={isFolder ? "Folder" : "File"} />
      {!isFolder && <M.Label title="Size" text={formatSize(file.size)} />}
      <M.Label title="Modified" text={formatDateTime(dm)} />
      <M.Label title="Created" text={formatDateTime(dc)} />
      <M.Separator />
      <M.Label title="Location" text={file.path} />
    </M>
  );
}

function FileListItem({
  id,
  file,
  typeDefs,
  isSelected,
  onTogglePreview,
  onCycleType,
  onRefresh,
  showPreview,
}: {
  id: string;
  file: EverythingResponse["results"][number];
  typeDefs: FileType[];
  isSelected: boolean;
  onTogglePreview: () => void;
  onCycleType: () => void;
  onRefresh: () => void;
  showPreview: boolean;
}) {
  const full = fullPathOf(file);
  const isFolder = file.type === "folder";
  const dm = filetimeToDate(file.date_modified);
  // Read text only for the selected row while the preview pane is on — the
  // detail panel only ever shows the selected item, so opening every
  // previewable file on the page would be wasted reads
  const needsText =
    showPreview && isSelected && !isFolder && isTextPreviewable(file.name);
  const [textContent, setTextContent] = useState<string | null | undefined>(
    needsText ? undefined : null,
  );

  useEffect(() => {
    if (!needsText) return;
    let cancelled = false;
    setTextContent(undefined);
    fs.promises
      .open(full, "r")
      .then(async (fh) => {
        try {
          const buf = Buffer.alloc(64 * 1024);
          const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
          return buf.slice(0, bytesRead);
        } finally {
          await fh.close();
        }
      })
      .then((buf) => {
        if (!cancelled)
          setTextContent(buf.includes(0) ? "" : buf.toString("utf8"));
      })
      .catch(() => {
        if (!cancelled) setTextContent(null);
      });
    return () => {
      cancelled = true;
    };
  }, [full, needsText]);

  const showInExplorer = () => {
    // spawn with separated arguments — the path must never go through a shell
    spawn("explorer", ["/select,", full], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    }).unref();
  };

  const sizeText =
    !isFolder && file.size !== undefined ? formatSize(file.size) : "";
  // With preview on the list is narrow: filename + short size only, path doesn't eat the row
  // With preview off the list is full width: "name · size" + full path
  const title =
    showPreview || !sizeText ? file.name : `${file.name} · ${sizeText}`;

  return (
    <List.Item
      id={id}
      icon={{
        source: iconForFile(file.name, file.type, typeDefs),
        tooltip: file.type === "folder" ? "Folder" : "File",
      }}
      title={{
        value: title,
        tooltip: `${fullPathOf(file)}${file.size ? " (" + formatNumber(parseInt(file.size, 10)) + " bytes)" : ""}`,
      }}
      subtitle={
        showPreview
          ? { value: sizeText, tooltip: fullPathOf(file) }
          : { value: file.path, tooltip: fullPathOf(file) }
      }
      accessories={[
        ...(isFolder ? [{ text: "Folder", icon: Icon.Tray }] : []),
        ...(dm
          ? [{ date: dm, tooltip: `Modified ${formatDateTime(dm)}` }]
          : []),
      ]}
      detail={
        <List.Item.Detail
          markdown={previewMarkdown(file, textContent)}
          metadata={<FileMetadata file={file} />}
        />
      }
      actions={
        <ActionPanel>
          <Action.Open title="Open" target={full} />
          <Action
            title="Toggle Preview"
            icon={Icon.Sidebar}
            shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
            onAction={onTogglePreview}
          />
          <Action
            title="Next Type Filter"
            icon={Icon.Filter}
            shortcut={{ modifiers: ["opt"], key: "t" }}
            onAction={onCycleType}
          />
          <Action
            title="Reveal in Explorer"
            icon={Icon.Finder}
            shortcut={Keyboard.Shortcut.Common.OpenWith}
            onAction={showInExplorer}
          />
          <Action.CopyToClipboard
            title="Copy Full Path"
            content={full}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.CopyToClipboard
            title="Copy Filename"
            content={file.name}
            shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
          />
          <Action.Push
            title="Configure Custom Types"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["opt"], key: "c" }}
            target={<ManageTypesCommand />}
          />
          <Action
            title="Extension Preferences"
            icon={Icon.Gear}
            onAction={() => openExtensionPreferences()}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRefresh}
          />
        </ActionPanel>
      }
    />
  );
}

function SetupActions({
  host,
  port,
  onRetry,
}: {
  host: string;
  port: number;
  onRetry: () => void;
}) {
  const [status, setStatus] = useState<EverythingStatus | null>(null);
  const [checking, setChecking] = useState(false);

  const check = async () => {
    setChecking(true);
    setStatus(await detectEverything(host, port));
    setChecking(false);
  };

  useEffect(() => {
    check();
  }, []);

  const runLongTask = async (
    title: string,
    fn: () => Promise<string | undefined>,
  ) => {
    const toast = await showToast({ style: Toast.Style.Animated, title });
    try {
      const err = await fn();
      if (err) {
        toast.style = Toast.Style.Failure;
        toast.title = `${title} failed`;
        toast.message = err;
      } else {
        toast.style = Toast.Style.Success;
        toast.title = `${title} succeeded`;
        await showHUD("Everything is ready");
        onRetry();
      }
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = title;
      toast.message = e instanceof Error ? e.message : String(e);
    }
  };

  return (
    <>
      <Action
        title="Detect Everything"
        icon={Icon.ArrowClockwise}
        onAction={check}
      />
      {status && !status.installed && (
        <Action
          title="Install Everything (Winget) and Enable Server"
          icon={Icon.Download}
          onAction={() =>
            runLongTask("Installing Everything", () =>
              installEverythingAndEnableHttp(port),
            )
          }
        />
      )}
      {status && status.installed && !status.httpOk && (
        <Action
          title={`Enable HTTP Server (127.0.0.1:${port})`}
          icon={Icon.Globe}
          onAction={() =>
            runLongTask("Enabling HTTP server", () => ensureHttpServer(port))
          }
        />
      )}
      <Action.OpenInBrowser
        title="Open Everything Download Page"
        url="https://www.voidtools.com/downloads/"
      />
      <Action.CopyToClipboard
        title="Copy Manual Setup Guide"
        content={MANUAL_SETUP_GUIDE}
      />
      {checking ? (
        <Action title="Detecting…" icon={Icon.CircleProgress} />
      ) : null}
    </>
  );
}
