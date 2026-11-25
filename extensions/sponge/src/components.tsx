import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Keyboard,
  List,
  Toast,
  open,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import {
  INSTALL_COMMAND,
  Item,
  SETUP_URL,
  SpongeError,
  SpongeMissingError,
  showItem,
  sourceUrl,
  stripFrontMatter,
  titleOf,
} from "./sponge";

const MAX_MARKDOWN = 100_000;

export function errorText(error: unknown): { title: string; description?: string } {
  if (error instanceof SpongeMissingError) {
    return {
      title: "Sponge CLI Not Found",
      description: `Install it with \`${INSTALL_COMMAND}\` (Node.js 24.20 or later), create a library with \`sponge init\`, or set its path in preferences.`,
    };
  }
  if (error instanceof SpongeError) return { title: error.message, description: error.hint };
  return { title: "Sponge Failed", description: error instanceof Error ? error.message : String(error) };
}

export function showError(error: unknown) {
  const { title, description } = errorText(error);
  return showFailureToast(error, {
    title,
    message: description,
    primaryAction:
      error instanceof SpongeMissingError ? { title: "Open Setup Guide", onAction: () => open(SETUP_URL) } : undefined,
  });
}

function RecoveryActions({ onRetry }: { onRetry: () => void }) {
  return (
    <ActionPanel>
      <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      <Action.OpenInBrowser title="Open Setup Guide" url={SETUP_URL} />
      <Action.CopyToClipboard title="Copy Install Command" content={INSTALL_COMMAND} />
    </ActionPanel>
  );
}

export function ErrorView({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { title, description } = errorText(error);
  return (
    <List.EmptyView
      icon={Icon.Warning}
      title={title}
      description={description}
      actions={<RecoveryActions onRetry={onRetry} />}
    />
  );
}

async function openOriginal(item: Item) {
  try {
    const url = sourceUrl(await showItem(item.itemId));
    if (url) await open(url);
    else await showToast({ style: Toast.Style.Failure, title: "This item has no web address" });
  } catch (error) {
    await showError(error);
  }
}

function ItemDetail({ item }: { item: Item }) {
  const { data, isLoading, error, revalidate } = usePromise((id: string) => showItem(id), [item.itemId], {
    failureToastOptions: { title: "Could Not Open Saved Item" },
  });
  const url = data ? sourceUrl(data) : undefined;
  let markdown = `# ${titleOf(item)}\n\n`;
  if (error) markdown += `${errorText(error).title}. ${errorText(error).description ?? ""}`;
  else if (data) {
    // Saved text often opens with the same title; show it once.
    const body = stripFrontMatter(data.item.markdown ?? "")
      .replace(/^#\s+(.+)\n*/, (heading, text: string) => (text.trim() === titleOf(item) ? "" : heading))
      .trim();
    markdown += body
      ? body.length > MAX_MARKDOWN
        ? `${body.slice(0, MAX_MARKDOWN)}\n\n*Shortened here. Read the full text in Sponge.*`
        : body
      : "*No saved text yet. The capture may still be running.*";
  }
  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={titleOf(item)}
      markdown={markdown}
      metadata={
        data ? (
          <Detail.Metadata>
            {data.item.kind ? <Detail.Metadata.Label title="Kind" text={data.item.kind} /> : null}
            {data.item.status ? <Detail.Metadata.Label title="Status" text={data.item.status} /> : null}
            {url ? <Detail.Metadata.Link title="Source" target={url} text={new URL(url).hostname} /> : null}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        error ? (
          <RecoveryActions onRetry={revalidate} />
        ) : (
          <ActionPanel>
            {url ? <Action.OpenInBrowser title="Open Original" url={url} /> : null}
            {url ? <Action.CopyToClipboard title="Copy URL" content={url} /> : null}
            <Action.CopyToClipboard
              title="Copy Item ID"
              content={item.itemId}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          </ActionPanel>
        )
      }
    />
  );
}

export function ItemRow({ item }: { item: Item }) {
  const accessories: List.Item.Accessory[] = [];
  if (item.revisionId === null) accessories.push({ tag: "Capturing", tooltip: "No saved copy yet" });
  if (item.createdAt) accessories.push({ date: new Date(item.createdAt), tooltip: "Saved" });
  return (
    <List.Item
      title={titleOf(item)}
      subtitle={item.kind}
      icon={item.kind === "pdf" ? Icon.Document : item.kind === "media" ? Icon.Video : Icon.Text}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push title="Read Item" icon={Icon.Eye} target={<ItemDetail item={item} />} />
          <Action title="Open Original" icon={Icon.Globe} onAction={() => openOriginal(item)} />
          <Action.CopyToClipboard title="Copy Item ID" content={item.itemId} shortcut={Keyboard.Shortcut.Common.Copy} />
        </ActionPanel>
      }
    />
  );
}
