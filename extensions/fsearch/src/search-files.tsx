import { homedir } from "node:os";
import { basename, dirname } from "node:path";
import { ReactNode, useEffect, useRef, useState } from "react";
import { Action, ActionPanel, Icon, Keyboard, List, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { BinaryNotFoundError, ContentFile, NameHit, search } from "./lib/fsearch";
import { installInTerminal } from "./lib/install";

const REPO_URL = "https://github.com/noahdunnagan/fsearch";

export default function Command() {
  const [query, setQuery] = useState("");
  const [isShowingDetail, setIsShowingDetail] = useState(true);
  const abortable = useRef<AbortController>(null);
  const limit = parseLimit(getPreferenceValues<Preferences>().limit);

  const { data, isLoading, error, revalidate } = usePromise(
    (q: string) => search({ query: q, limit, signal: abortable.current?.signal }),
    [query.trim()],
    {
      abortable,
      execute: query.trim().length > 0,
      // Errors render in the empty view; a toast on every keystroke would be noise.
      onError: () => {},
    },
  );

  // The first run crawls the whole disk; the daemon answers "indexing: …" until it's done.
  const isIndexing = error?.message.startsWith("indexing") ?? false;
  useEffect(() => {
    if (!isIndexing) return;
    const timer = setTimeout(revalidate, 2000);
    return () => clearTimeout(timer);
  }, [isIndexing, error, revalidate]);

  const trimmed = query.trim();
  const result = trimmed ? data : undefined;
  const isContent = result?.type === "content";

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search files, or use ext:, in:, grep:, sym:…"
      isShowingDetail={isContent && isShowingDetail}
      throttle
    >
      {!trimmed ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search Your Disk"
          description={
            "Try: main.rs · ext:pdf invoice · readme in:~/Developer · grep:TODO ext:ts · size:>5mb mtime:<7d"
          }
        />
      ) : isIndexing && error ? (
        <List.EmptyView icon={Icon.HardDrive} title="Building Index" description={error.message} />
      ) : error ? (
        <ErrorView error={error} onRetry={revalidate} />
      ) : result?.type === "names" ? (
        <List.Section title="Files" subtitle={summary(result.hits.length, result.tookUs)}>
          {result.hits.map((hit) => (
            <NameItem key={hit.path} hit={hit} />
          ))}
        </List.Section>
      ) : result?.type === "content" ? (
        <List.Section
          title={result.indexing ? "Matches (content index still building)" : "Matches"}
          subtitle={summary(result.files.length, result.tookUs)}
        >
          {result.files.map((file) => (
            <ContentItem key={file.path} file={file} onToggleDetail={() => setIsShowingDetail((value) => !value)} />
          ))}
        </List.Section>
      ) : null}
      {trimmed && !isLoading && !error ? <List.EmptyView icon={Icon.Document} title="No Results" /> : null}
    </List>
  );
}

function NameItem({ hit }: { hit: NameHit }) {
  const accessories: List.Item.Accessory[] = [];
  if (hit.kind === "file") accessories.push({ text: formatBytes(hit.size) });
  if (hit.mtime.getTime() > 0) accessories.push({ date: hit.mtime, tooltip: `Modified ${hit.mtime.toLocaleString()}` });

  return (
    <List.Item
      title={basename(hit.path) || hit.path}
      subtitle={tildify(dirname(hit.path))}
      icon={{ fileIcon: hit.path }}
      accessories={accessories}
      quickLook={{ path: hit.path, name: basename(hit.path) }}
      actions={<FileActions path={hit.path} />}
    />
  );
}

function ContentItem({ file, onToggleDetail }: { file: ContentFile; onToggleDetail: () => void }) {
  const first = file.matches[0];
  const markdown = [
    `**${basename(file.path)}**`,
    "",
    "```",
    ...file.matches.map((m) => `${String(m.line).padStart(5)}  ${m.text.trim()}`),
    "```",
  ].join("\n");

  return (
    <List.Item
      title={basename(file.path)}
      subtitle={first ? `${first.line}: ${first.text.trim()}` : tildify(dirname(file.path))}
      icon={{ fileIcon: file.path }}
      accessories={[{ text: `${file.matches.length} ${file.matches.length === 1 ? "match" : "matches"}` }]}
      quickLook={{ path: file.path, name: basename(file.path) }}
      detail={
        <List.Item.Detail
          markdown={markdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Path" text={tildify(file.path)} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <FileActions path={file.path}>
          <Action
            title="Toggle Details"
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            onAction={onToggleDetail}
          />
        </FileActions>
      }
    />
  );
}

function FileActions({ path, children }: { path: string; children?: ReactNode }) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.Open title="Open" target={path} />
        <Action.ShowInFinder path={path} />
        <Action.OpenWith path={path} shortcut={Keyboard.Shortcut.Common.Open} />
        <Action.ToggleQuickLook shortcut={Keyboard.Shortcut.Common.ToggleQuickLook} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy Path" content={path} shortcut={Keyboard.Shortcut.Common.CopyPath} />
        <Action.CopyToClipboard
          title="Copy Name"
          content={basename(path)}
          shortcut={Keyboard.Shortcut.Common.CopyName}
        />
        <Action.CopyToClipboard
          title="Copy File"
          content={{ file: path }}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
      </ActionPanel.Section>
      {children ? <ActionPanel.Section>{children}</ActionPanel.Section> : null}
    </ActionPanel>
  );
}

function ErrorView({ error, onRetry }: { error: Error; onRetry: () => void }) {
  if (error instanceof BinaryNotFoundError) {
    return (
      <List.EmptyView
        icon={Icon.Warning}
        title="fsearch Is Not Installed"
        description={`No binary at ${tildify(error.binaryPath)}. Press ↵ to build and install it in Terminal.`}
        actions={
          <ActionPanel>
            <Action title="Install in Terminal" icon={Icon.Terminal} onAction={installInTerminal} />
            <Action.OpenInBrowser title="Open Installation Guide" url={REPO_URL} />
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }
  return (
    <List.EmptyView
      icon={Icon.ExclamationMark}
      title="Search Failed"
      description={error.message}
      actions={
        <ActionPanel>
          <Action title="Retry" icon={Icon.ArrowClockwise} onAction={onRetry} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

function parseLimit(value: string | undefined): number {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 1000) : 100;
}

function summary(count: number, tookUs: number): string {
  const ms = tookUs / 1000;
  return `${count} in ${ms < 10 ? ms.toFixed(2) : Math.round(ms)} ms`;
}

function tildify(path: string): string {
  const home = homedir();
  return path === home || path.startsWith(home + "/") ? "~" + path.slice(home.length) : path;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}
