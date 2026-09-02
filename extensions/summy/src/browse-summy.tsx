import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Detail,
  Icon,
  Image,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { SummyItem, SummyAPIError, deleteItem, friendlyError, listItems, regenerateItem } from "./api";

type TypeFilter = "all" | SummyItem["type"];

const typeNames: Record<SummyItem["type"], string> = {
  link: "Link",
  image: "Image",
  pdf: "PDF",
  video: "Video",
  audio: "Audio",
  text: "Text",
};

const typeIcons: Record<SummyItem["type"], Icon> = {
  link: Icon.Link,
  image: Icon.Image,
  pdf: Icon.Document,
  video: Icon.Video,
  audio: Icon.Waveform,
  text: Icon.Text,
};

export default function Command() {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const { data, error, isLoading, mutate, revalidate } = useCachedPromise(listItems, [], {
    initialData: [],
    keepPreviousData: true,
    onError: () => undefined,
  });

  const visibleItems = useMemo(
    () => data.filter((item) => typeFilter === "all" || item.type === typeFilter),
    [data, typeFilter],
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search titles, summaries, and sources"
      filtering={{ keepSectionOrder: true }}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Type"
          value={typeFilter}
          onChange={(value) => setTypeFilter(value as TypeFilter)}
        >
          <List.Dropdown.Item title="Everything" value="all" icon={Icon.Tray} />
          {Object.entries(typeNames).map(([type, title]) => (
            <List.Dropdown.Item key={type} title={title} value={type} icon={typeIcons[type as SummyItem["type"]]} />
          ))}
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          title="Couldn’t Load Summy"
          description={friendlyError(error)}
          icon={error instanceof SummyAPIError && error.status === 401 ? Icon.Key : Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action title="Open Summy Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : visibleItems.length === 0 && !isLoading ? (
        <List.EmptyView
          title={typeFilter === "all" ? "Nothing Saved Yet" : `No ${typeNames[typeFilter as SummyItem["type"]]} Items`}
          description="Use Save to Summy from Raycast to add something."
          icon={Icon.Tray}
        />
      ) : (
        visibleItems.map((item) => (
          <List.Item
            key={item.id}
            icon={itemIcon(item)}
            title={displayTitle(item)}
            subtitle={sourceHost(item) ?? typeNames[item.type]}
            keywords={itemKeywords(item)}
            actions={
              <ItemActions
                item={item}
                onRegenerate={() => mutate(regenerateItem(item.id))}
                onDelete={() =>
                  mutate(deleteItem(item.id), {
                    optimisticUpdate: (current) => current.filter((candidate) => candidate.id !== item.id),
                    rollbackOnError: true,
                  })
                }
                onRefresh={revalidate}
              />
            }
          />
        ))
      )}
    </List>
  );
}

function ItemActions(props: {
  item: SummyItem;
  onRegenerate: () => Promise<unknown>;
  onDelete: () => Promise<unknown>;
  onRefresh: () => void;
  showsOpenSummary?: boolean;
}) {
  const { item, onRegenerate, onDelete, onRefresh, showsOpenSummary = true } = props;
  return (
    <ActionPanel>
      {showsOpenSummary ? (
        <Action.Push
          title="Open Summary"
          icon={Icon.Document}
          target={<ItemDetail item={item} onRegenerate={onRegenerate} onDelete={onDelete} onRefresh={onRefresh} />}
        />
      ) : null}
      {item.sourceUrl ? <Action.OpenInBrowser title="Open Original" url={item.sourceUrl} /> : null}
      <Action.CopyToClipboard
        title="Copy Summary"
        content={plainSummary(item)}
        shortcut={Keyboard.Shortcut.Common.Copy}
      />
      {item.sourceUrl ? <Action.CopyToClipboard title="Copy Original Link" content={item.sourceUrl} /> : null}
      <ActionPanel.Section>
        <Action
          title="Summarise Again"
          icon={Icon.ArrowClockwise}
          onAction={async () => {
            const toast = await showToast({ style: Toast.Style.Animated, title: "Sending back to Summy…" });
            try {
              await onRegenerate();
              toast.style = Toast.Style.Success;
              toast.title = "Summarising Again";
            } catch (error) {
              toast.style = Toast.Style.Failure;
              toast.title = "Couldn’t Restart Summary";
              toast.message = friendlyError(error);
            }
          }}
        />
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={onRefresh}
        />
        <Action title="Open Summy Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Delete from Summy"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={async () => {
            const confirmed = await confirmAlert({
              title: "Delete this item?",
              message: "This removes the saved item and its summary from Summy.",
              primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
            });
            if (!confirmed) return;
            try {
              await onDelete();
              await showToast({ style: Toast.Style.Success, title: "Deleted from Summy" });
            } catch (error) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Couldn’t Delete Item",
                message: friendlyError(error),
              });
            }
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function ItemDetail(props: {
  item: SummyItem;
  onRegenerate: () => Promise<unknown>;
  onDelete: () => Promise<unknown>;
  onRefresh: () => void;
}) {
  const { item, onRegenerate, onDelete, onRefresh } = props;
  const { pop } = useNavigation();

  return (
    <Detail
      markdown={detailMarkdown(item)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Type" text={typeNames[item.type]} icon={typeIcons[item.type]} />
          <Detail.Metadata.Label title="Status" text={statusName(item)} icon={statusIcon(item)} />
          <Detail.Metadata.Label title="Saved" text={formatDate(item.createdAt)} icon={Icon.Calendar} />
          {item.sourceUrl ? (
            <Detail.Metadata.Link title="Source" text={sourceHost(item) ?? "Open original"} target={item.sourceUrl} />
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ItemActions
          item={item}
          onRegenerate={onRegenerate}
          onDelete={async () => {
            await onDelete();
            pop();
          }}
          onRefresh={onRefresh}
          showsOpenSummary={false}
        />
      }
    />
  );
}

function detailMarkdown(item: SummyItem): string {
  const title = escapeMarkdown(displayTitle(item));
  const image = item.imageUrl ? `![${title}](<${encodeURI(item.imageUrl)}>)\n\n` : "";

  if (item.status === "pending" || item.status === "processing") {
    return `${image}# ${title}\n\n## Summarising…\n\nThis item will update when its summary is ready.`;
  }
  if (item.status === "error") {
    return `${image}# ${title}\n\n## Couldn’t summarise this item\n\nUse **Summarise Again** from the action menu to retry.`;
  }

  const points = (item.summaryPoints ?? [])
    .map((point) => `${point.emoji}  ${escapeMarkdown(point.text)}`)
    .join("\n\n");
  const paragraph = item.summaryParagraph ? `\n\n## In brief\n\n${escapeMarkdown(item.summaryParagraph)}` : "";
  const questions = (item.qa ?? [])
    .map((pair) => `**${escapeMarkdown(pair.question)}**\n\n${escapeMarkdown(pair.answer)}`)
    .join("\n\n---\n\n");
  const questionSection = questions ? `\n\n## Questions you might ask\n\n${questions}` : "";

  return `${image}# ${title}\n\n${points || "No summary points yet."}${paragraph}${questionSection}`;
}

function plainSummary(item: SummyItem): string {
  const points = (item.summaryPoints ?? []).map((point) => `${point.emoji} ${point.text}`).join("\n");
  return [displayTitle(item), points, item.summaryParagraph].filter(Boolean).join("\n\n");
}

function displayTitle(item: SummyItem): string {
  return item.title?.trim() || item.sourceUrl || typeNames[item.type];
}

function sourceHost(item: SummyItem): string | undefined {
  if (!item.sourceUrl) return undefined;
  try {
    return new URL(item.sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

function itemKeywords(item: SummyItem): string[] {
  return [
    item.sourceUrl,
    item.rawText,
    item.summaryParagraph,
    ...(item.summaryPoints ?? []).map((point) => point.text),
  ].filter((value): value is string => Boolean(value));
}

function itemIcon(item: SummyItem): Image.ImageLike {
  if (item.imageUrl) return { source: item.imageUrl, mask: Image.Mask.RoundedRectangle };
  return { source: typeIcons[item.type], tintColor: Color.SecondaryText };
}

function statusName(item: SummyItem): string {
  if (item.status === "done") return "Ready";
  if (item.status === "error") return "Needs attention";
  return "Summarising";
}

function statusIcon(item: SummyItem): Icon {
  if (item.status === "done") return Icon.CheckCircle;
  if (item.status === "error") return Icon.ExclamationMark;
  return Icon.CircleProgress;
}

function formatDate(value: string): string {
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}[\]()<>#+\-.!|])/g, "\\$1");
}
