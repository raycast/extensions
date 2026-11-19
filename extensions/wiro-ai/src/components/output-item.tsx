import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  Keyboard,
  List,
  open,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { Fragment, type ReactNode, useEffect, useRef, useState } from "react";
import { formatBytes, type ResultItem } from "../lib/outputs";
import { cachedCopy, saveTitle, saveToFolder } from "../lib/preferences";
import { USER_AGENT } from "../lib/wiro";

const ICONS: Record<ResultItem["kind"], Icon> = {
  image: Icon.Image,
  video: Icon.Video,
  audio: Icon.Music,
  text: Icon.Text,
  file: Icon.Document,
};

// The preview shows the start of a long text; Copy, Paste and Save use all of it.
const PREVIEW_CHARS = 20_000;

/** Downloads the item into the cache folder once, so Quick Look, Copy and Open can use a local file. */
function useLocalCopy(item: ResultItem, group: string): string | undefined {
  const [path, setPath] = useState<string>();
  useEffect(() => {
    if (!item.url || item.kind === "text") return;
    let cancelled = false;
    cachedCopy(item.url, item.name, group)
      .then((local) => !cancelled && setPath(local))
      .catch(() => undefined); // Best effort: the actions download again on demand.
    return () => {
      cancelled = true;
    };
  }, [item.url, item.name, group]);
  return path;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`Could not read the text (HTTP ${response.status}).`);
  return response.text();
}

/**
 * The content of a text file output, such as a transcript, read once. Not cached on disk; a
 * failed read shows its reason and can be tried again.
 */
function useRemoteText(item: ResultItem): { text?: string; error?: Error; reload: () => void } {
  const remote = item.text === undefined && item.kind === "text" && Boolean(item.url);
  const { data, error, revalidate } = usePromise(fetchText, [item.url ?? ""], {
    execute: remote,
    // The preview shows the reason with a Try Again action, so no toast for each failed text.
    onError: () => undefined,
  });
  return { text: item.text ?? data, error: remote ? error : undefined, reload: revalidate };
}

function previewMarkdown(item: ResultItem, text: string | undefined, textError?: Error): string {
  switch (item.kind) {
    case "image":
      return `![${item.name}](${item.url})`;
    case "text":
      if (text === undefined && textError) return `**Could not read the text.** ${textError.message}`;
      if (text === undefined) return "_Loading the text…_";
      return text.length > PREVIEW_CHARS ? `${text.slice(0, PREVIEW_CHARS)}…` : text;
    case "video":
      return `## ${item.name}\n\nVideo. Open it, or preview it with Quick Look.`;
    case "audio":
      return `## ${item.name}\n\nAudio. Open it, or play it with Quick Look.`;
    default:
      return `## ${item.name}\n\n[Open in browser](${item.url})`;
  }
}

interface OutputListItemProps {
  item: ResultItem;
  /** Groups cached files, such as the task id. */
  group: string;
  /** Metadata rows for the detail panel; the item adds its file size. */
  metadata?: ReactNode;
  /** Actions added after the item's own, such as Open Model Page. */
  extraActions?: ReactNode;
}

export function OutputListItem({ item, group, metadata, extraActions }: OutputListItemProps) {
  const localPath = useLocalCopy(item, group);
  const { text, error: textError, reload: reloadText } = useRemoteText(item);
  const savedPath = useRef<string | undefined>(undefined);
  const noun = item.kind === "text" ? "text" : item.kind === "file" ? "file" : item.kind;

  async function local(): Promise<string> {
    if (localPath) return localPath;
    if (!item.url) throw new Error("This output has no file.");
    return cachedCopy(item.url, item.name, group);
  }

  async function run(title: string, action: () => Promise<void>) {
    try {
      await action();
    } catch (error) {
      await showFailureToast(error, { title });
    }
  }

  async function save(): Promise<string> {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Saving ${noun}` });
    const path = await saveToFolder(
      { url: item.url, localPath, text },
      item.kind === "text" && !/\.(txt|srt|vtt|md|csv|json)$/i.test(item.name) ? `${item.name}.txt` : item.name,
    );
    savedPath.current = path;
    toast.style = Toast.Style.Success;
    toast.title = `Saved ${noun}`;
    toast.message = path;
    toast.primaryAction = { title: "Show in Finder", onAction: () => showInFinder(path) };
    return path;
  }

  // Raycast gives the first two actions Enter and Cmd+Enter and hides any shortcut of their own,
  // so an action gets its custom shortcut only from the third place on.
  type MakeAction = (withShortcut: boolean) => ReactNode;
  const saveAction: MakeAction = (withShortcut) => (
    <Action
      title={saveTitle()}
      icon={Icon.Download}
      shortcut={withShortcut ? Keyboard.Shortcut.Common.Save : undefined}
      onAction={() => run(`Could not save the ${noun}`, async () => void (await save()))}
    />
  );
  const finderAction: MakeAction = (withShortcut) => (
    <Action
      title="Show in Finder"
      icon={Icon.Finder}
      shortcut={withShortcut ? { modifiers: ["cmd", "shift"], key: "f" } : undefined}
      onAction={() => run("Could not show the file", async () => showInFinder(savedPath.current ?? (await save())))}
    />
  );
  const copyFileAction =
    (title: string): MakeAction =>
    (withShortcut) => (
      <Action
        title={title}
        icon={Icon.CopyClipboard}
        shortcut={withShortcut ? { modifiers: ["cmd", "shift"], key: "v" } : undefined}
        onAction={() =>
          run(`Could not copy the ${noun}`, async () => {
            await Clipboard.copy({ file: await local() });
            await showToast({ style: Toast.Style.Success, title: `Copied ${noun}` });
          })
        }
      />
    );
  const openAction: MakeAction = (withShortcut) => (
    <Action
      title="Open"
      icon={Icon.AppWindow}
      shortcut={withShortcut ? Keyboard.Shortcut.Common.Open : undefined}
      onAction={() => run(`Could not open the ${noun}`, async () => open(await local()))}
    />
  );
  const quickLookAction: MakeAction | undefined = localPath
    ? (withShortcut) => (
        <Action.ToggleQuickLook shortcut={withShortcut ? Keyboard.Shortcut.Common.ToggleQuickLook : undefined} />
      )
    : undefined;
  const browserAction: MakeAction | undefined = item.url
    ? () => <Action.OpenInBrowser url={item.url as string} />
    : undefined;
  const copyUrlAction: MakeAction | undefined = item.url
    ? (withShortcut) => (
        <Action.CopyToClipboard
          title="Copy URL"
          content={item.url as string}
          shortcut={withShortcut ? Keyboard.Shortcut.Common.Copy : undefined}
        />
      )
    : undefined;
  const copyTextAction: MakeAction | undefined =
    text !== undefined ? () => <Action.CopyToClipboard title="Copy Text" content={text} /> : undefined;
  const pasteTextAction: MakeAction | undefined =
    text !== undefined
      ? (withShortcut) => (
          <Action.Paste
            title="Paste Text"
            content={text}
            shortcut={withShortcut ? { modifiers: ["cmd", "shift"], key: "enter" } : undefined}
          />
        )
      : undefined;
  const reloadTextAction: MakeAction | undefined =
    text === undefined && textError
      ? () => <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={reloadText} />
      : undefined;

  let order: Array<MakeAction | undefined>;
  if (item.kind === "image") {
    order = [
      copyFileAction("Copy Image"),
      saveAction,
      finderAction,
      quickLookAction,
      openAction,
      browserAction,
      copyUrlAction,
    ];
  } else if (item.kind === "video" || item.kind === "audio") {
    order = [
      openAction,
      quickLookAction,
      saveAction,
      finderAction,
      copyFileAction(item.kind === "video" ? "Copy Video" : "Copy Audio"),
      browserAction,
      copyUrlAction,
    ];
  } else if (item.kind === "text") {
    order = [reloadTextAction, copyTextAction, pasteTextAction, saveAction, finderAction, browserAction, copyUrlAction];
  } else {
    order = [browserAction, saveAction, finderAction, quickLookAction, copyUrlAction];
  }
  const actions = order
    .filter((make): make is MakeAction => make !== undefined)
    .map((make, index) => <Fragment key={index}>{make(index >= 2)}</Fragment>);
  const size = formatBytes(item.sizeBytes);

  return (
    <List.Item
      id={item.id}
      icon={ICONS[item.kind]}
      title={item.kind === "text" ? (text ?? item.name).replace(/\s+/g, " ").slice(0, 80) || item.name : item.name}
      quickLook={localPath ? { path: localPath, name: item.name } : undefined}
      detail={
        <List.Item.Detail
          markdown={previewMarkdown(item, text, textError)}
          metadata={
            metadata || size ? (
              <List.Item.Detail.Metadata>
                {metadata}
                {size && <List.Item.Detail.Metadata.Label title="Size" text={size} />}
              </List.Item.Detail.Metadata>
            ) : undefined
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>{actions}</ActionPanel.Section>
          {extraActions && <ActionPanel.Section>{extraActions}</ActionPanel.Section>}
        </ActionPanel>
      }
    />
  );
}
