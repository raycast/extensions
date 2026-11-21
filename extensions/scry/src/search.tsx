import { basename } from "node:path";
import { ReactNode, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Color,
  Grid,
  Icon,
  Keyboard,
  LaunchType,
  environment,
  getPreferenceValues,
  launchCommand,
  openExtensionPreferences,
} from "@raycast/api";
import { getProgressIcon, showFailureToast, usePromise } from "@raycast/utils";
import { FolderActions, tilde, useFolders } from "./folders";
import { archive, install } from "./install";
import { Download, Progress, literal, run, stopEarlierSearches } from "./scry";

const LIMIT = "50";
const SEARCH_FAILED = "scry failed";

const DELAY = 1000;
const LONG = 8000;
const DRAW = 250;

export type Mode = "query" | "text";

const MODES = {
  query: {
    command: "search-images",
    title: "Search Images",
    placeholder: "What the image shows",
    hint: "Describe the image",
    icon: Icon.MagnifyingGlass,
  },
  text: {
    command: "search-text",
    title: "Search Text in Images",
    placeholder: "Text in the image",
    hint: "Type the text in the image",
    icon: Icon.Text,
  },
};

export function Search({ mode, query: initial }: { mode: Mode; query: string }) {
  const { scryPath } = getPreferenceValues<Preferences>();
  const setup = useScry(scryPath);
  const scry = setup.scry;
  const folders = useFolders();
  const folder = folders.folder;
  const [query, setQuery] = useState(initial);
  const text = query.trim();
  const options = mode === "query" ? [`--query=${text}`] : [`--text=${literal(text)}`, "--sort", "date"];
  const search = useSearch(scry, folder, text === "" ? undefined : options);
  const other = MODES[mode === "query" ? "text" : "query"];
  const actions = (
    <>
      <ActionPanel.Section>
        <Action
          title={other.title}
          icon={other.icon}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          onAction={async () => {
            try {
              await launchCommand({ name: other.command, type: LaunchType.UserInitiated, arguments: { query } });
            } catch (error) {
              await showFailureToast(error, { title: `Cannot open ${other.title}` });
            }
          }}
        />
      </ActionPanel.Section>
      <FolderActions folders={folders} />
    </>
  );

  return (
    <Grid
      isLoading={search.isLoading || folders.isLoading}
      filtering={false}
      throttle
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder={MODES[mode].placeholder}
      searchBarAccessory={
        folders.list.length > 0 ? (
          <Grid.Dropdown tooltip="Folder" value={folder} onChange={folders.choose}>
            {folders.list.map((path) => (
              <Grid.Dropdown.Item key={path} title={tilde(path)} value={path} icon={Icon.Folder} />
            ))}
          </Grid.Dropdown>
        ) : undefined
      }
    >
      {setup.error ? (
        <Failure title="Cannot download scry" error={setup.error} retry={setup.retry} />
      ) : scry === undefined && setup.download ? (
        <Grid.EmptyView icon={Icon.Download} title="Downloading scry" description={downloaded(setup.download)} />
      ) : !folders.isLoading && folder === undefined ? (
        <Grid.EmptyView
          icon={Icon.Folder}
          title="Add a folder to search"
          actions={
            <ActionPanel>
              <FolderActions folders={folders} />
            </ActionPanel>
          }
        />
      ) : text === "" ? (
        <Grid.EmptyView
          icon={MODES[mode].icon}
          title={MODES[mode].hint}
          actions={<ActionPanel>{actions}</ActionPanel>}
        />
      ) : scry === undefined || folder === undefined ? (
        <Grid.EmptyView icon={Icon.Hourglass} title="Searching" />
      ) : (
        <Matches search={search} scry={scry} folder={folder} actions={actions} />
      )}
    </Grid>
  );
}

function useScry(scryPath: string | undefined) {
  const [download, setDownload] = useState<Download>();
  const { data, error, revalidate } = usePromise(
    async (scryPath: string) => scryPath || install(environment.supportPath, archive(), throttled(setDownload)),
    [scryPath ?? ""],
    { failureToastOptions: { title: "Cannot download scry" } },
  );
  return { scry: data, download, error, retry: revalidate };
}

function Similar({ scry, folder, path }: { scry: string; folder: string; path: string }) {
  const search = useSearch(scry, folder, [`--like=${path}`]);
  return (
    <Grid isLoading={search.isLoading} navigationTitle={`Like ${basename(path)}`} searchBarPlaceholder="Filter by name">
      <Matches search={search} scry={scry} folder={folder} />
    </Grid>
  );
}

type Search = {
  isLoading: boolean;
  status: Status | undefined;
  error: Error | undefined;
  retry: () => void;
  paths: string[];
};

function useSearch(scry: string | undefined, folder: string | undefined, options: string[] | undefined): Search {
  const abortable = useRef<AbortController>(null);
  const [progress, setProgress] = useState<Status>();
  const { isLoading, data, error, revalidate } = usePromise(
    (scry: string, folder: string, options: string[]) =>
      search(scry, folder, options, setProgress, abortable.current?.signal),
    [scry ?? "", folder ?? "", options ?? []],
    {
      abortable,
      execute: scry !== undefined && folder !== undefined && options !== undefined,
      failureToastOptions: { title: SEARCH_FAILED },
    },
  );
  const status = isLoading ? progress : undefined;
  const paths = options === undefined || status || error ? [] : (data ?? []);
  return { isLoading, status, error, retry: revalidate, paths };
}

function Matches({
  search,
  scry,
  folder,
  actions,
}: {
  search: Search;
  scry: string;
  folder: string;
  actions?: ReactNode;
}) {
  const panel = actions && <ActionPanel>{actions}</ActionPanel>;
  return (
    <>
      {search.status ? (
        <Grid.EmptyView {...progressView(search.status)} actions={panel} />
      ) : search.isLoading ? (
        <Grid.EmptyView icon={Icon.Hourglass} title="Searching" actions={panel} />
      ) : search.error ? (
        <Failure title={SEARCH_FAILED} error={search.error} retry={search.retry} actions={actions} />
      ) : (
        <Grid.EmptyView icon={Icon.Image} title="No image matches" actions={panel} />
      )}
      {search.paths.map((path) => (
        <Grid.Item
          key={path}
          content={{ source: path }}
          title={basename(path)}
          quickLook={{ path }}
          actions={
            <ActionPanel>
              <Action.Open title="Open" target={path} />
              <Action.ShowInFinder path={path} />
              <Action.ToggleQuickLook shortcut={Keyboard.Shortcut.Common.ToggleQuickLook} />
              <Action.Push
                title="Find Similar"
                icon={Icon.MagnifyingGlass}
                shortcut={{ modifiers: ["cmd"], key: "l" }}
                target={<Similar scry={scry} folder={folder} path={path} />}
              />
              <Action.CopyToClipboard
                title="Copy Image"
                content={{ file: path }}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
              <Action.CopyToClipboard title="Copy Path" content={path} shortcut={Keyboard.Shortcut.Common.CopyPath} />
              {actions}
            </ActionPanel>
          }
        />
      ))}
    </>
  );
}

function Failure({
  title,
  error,
  retry,
  actions,
}: {
  title: string;
  error: Error;
  retry: () => void;
  actions?: ReactNode;
}) {
  return (
    <Grid.EmptyView
      icon={Icon.Warning}
      title={title}
      description={error.message}
      actions={
        <ActionPanel>
          <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={retry} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          {actions}
        </ActionPanel>
      }
    />
  );
}

async function search(
  scry: string,
  folder: string,
  options: string[],
  show: (status: Status | undefined) => void,
  signal?: AbortSignal,
): Promise<string[]> {
  const args = ["--json", ...options, "--limit", LIMIT, "--", folder];
  show(undefined);
  await stopEarlierSearches();
  signal?.throwIfAborted();
  const started = Date.now();
  const draw = throttled(show);
  return run(scry, args, (event) => {
    const loading = event.type === "progress" && event.stage === "load";
    const elapsed = Date.now() - started;
    if (!signal?.aborted && elapsed >= DELAY && !loading) draw({ event, elapsed });
  });
}

function throttled<T>(set: (value: T) => void): (value: T) => void {
  let drawn = 0;
  return (value) => {
    if (Date.now() - drawn < DRAW) return;
    drawn = Date.now();
    set(value);
  };
}

type Status = { event: Download | Progress; elapsed: number };

function progressView({ event, elapsed }: Status): Grid.EmptyView.Props {
  const icon = getProgressIcon(event.total > 0 ? event.done / event.total : 0, Color.Purple);
  const note = elapsed >= LONG ? "\nYou can close Raycast, scry keeps going in the background" : "";
  if (event.type === "download") {
    const description = `${event.label}, ${downloaded(event)}${note}`;
    return { icon, title: "Downloading", description };
  }
  const total = `${event.total.toLocaleString()}${event.walking ? "+" : ""}`;
  return { icon, title: "Indexing", description: `${event.done.toLocaleString()} of ${total} images${note}` };
}

function downloaded({ done, total }: Download): string {
  const megabytes = (bytes: number) => Math.round(bytes / 1e6).toLocaleString();
  return `${megabytes(done)} of ${megabytes(total)} MB`;
}
