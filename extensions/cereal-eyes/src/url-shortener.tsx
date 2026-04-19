import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  confirmAlert,
  environment,
  Icon,
  List,
  openExtensionPreferences,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  deleteShortUrl,
  getShortUrls,
  resolveCredentials,
  updateShortUrl,
} from "./utils/api";
import type { ShortUrl } from "./types";
import EditShortUrl from "./edit-short-url";
import ShortUrlAnalytics from "./short-url-analytics";
import ShortUrlForm from "./short-url-form";

export default function UrlShortener() {
  const { isMissingToken } = resolveCredentials();
  const { push } = useNavigation();
  const { data, error, isLoading, revalidate } = useCachedPromise(
    async () => {
      const response = await getShortUrls();
      return response.data;
    },
    [],
    { execute: !isMissingToken },
  );

  const shortUrls = data ?? [];

  return (
    <List
      isLoading={isLoading}
      navigationTitle="URL Shortener"
      searchBarPlaceholder="Search short URLs…"
      actions={
        <ActionPanel>
          <Action
            title="Create Short URL"
            icon={Icon.Plus}
            onAction={() => push(<ShortUrlForm onSuccess={revalidate} />)}
          />
        </ActionPanel>
      }
    >
      {isMissingToken ? (
        <List.EmptyView
          icon={Icon.Warning}
          title={
            environment.isDevelopment
              ? "Dev API Token required"
              : "API Token required"
          }
          description="Set your API token in extension preferences."
          actions={
            <ActionPanel>
              <Action
                title="Open Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      ) : error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not load short URLs"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ) : shortUrls.length === 0 && !isLoading ? (
        <EmptyShortUrlList onCreate={revalidate} />
      ) : (
        shortUrls.map((shortUrl) => (
          <ShortUrlListItem
            key={shortUrl.id}
            shortUrl={shortUrl}
            onRevalidate={revalidate}
          />
        ))
      )}
    </List>
  );
}

function EmptyShortUrlList({ onCreate }: { onCreate: () => void }) {
  const { push } = useNavigation();

  return (
    <List.EmptyView
      icon={Icon.Link}
      title="No short URLs yet"
      description="Create your first short link from Cereal Eyes."
      actions={
        <ActionPanel>
          <Action
            title="Create Short URL"
            icon={Icon.Plus}
            onAction={() => push(<ShortUrlForm onSuccess={onCreate} />)}
          />
        </ActionPanel>
      }
    />
  );
}

function ShortUrlListItem({
  shortUrl,
  onRevalidate,
}: {
  shortUrl: ShortUrl;
  onRevalidate: () => void;
}) {
  const { push } = useNavigation();
  const accessories: List.Item.Accessory[] = [
    {
      text: `${shortUrl.clicks_total} click${shortUrl.clicks_total === 1 ? "" : "s"}`,
      tooltip: "Total clicks",
    },
  ];

  if (!shortUrl.is_active) {
    accessories.push({
      tag: { value: "Inactive", color: Color.SecondaryText },
    });
  }

  if (shortUrl.is_expired) {
    accessories.push({ tag: { value: "Expired", color: Color.Red } });
  } else if (shortUrl.expires_at) {
    accessories.push({
      icon: { source: Icon.Clock, tintColor: Color.Yellow },
      tooltip: `Expires ${new Date(shortUrl.expires_at).toLocaleString()}`,
    });
  }

  async function handleToggleActive() {
    const next = !shortUrl.is_active;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: next ? "Activating link…" : "Pausing link…",
    });

    try {
      await updateShortUrl(shortUrl.id, { is_active: next });
      toast.style = Toast.Style.Success;
      toast.title = next ? "Link activated" : "Link paused";
      onRevalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update link";
      toast.message = error instanceof Error ? error.message : undefined;
    }
  }

  async function handleDelete() {
    const confirmed = await confirmAlert({
      title: "Delete Short URL",
      message: `${shortUrl.short_url} will stop resolving immediately. This cannot be undone.`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting short URL…",
    });

    try {
      await deleteShortUrl(shortUrl.id);
      toast.style = Toast.Style.Success;
      toast.title = "Short URL deleted";
      onRevalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to delete short URL";
      toast.message = error instanceof Error ? error.message : undefined;
    }
  }

  return (
    <List.Item
      title={shortUrl.title ?? shortUrl.short_url}
      subtitle={shortUrl.original_url}
      accessories={accessories}
      keywords={[shortUrl.short_url, shortUrl.original_url, shortUrl.code]}
      icon={{
        source: Icon.Link,
        tintColor:
          shortUrl.is_active && !shortUrl.is_expired
            ? Color.Blue
            : Color.SecondaryText,
      }}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Create Short URL"
              icon={Icon.Plus}
              onAction={() => push(<ShortUrlForm onSuccess={onRevalidate} />)}
            />
            <Action
              title="Edit Link"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              onAction={() =>
                push(
                  <EditShortUrl shortUrl={shortUrl} onSuccess={onRevalidate} />,
                )
              }
            />
            <Action
              title={shortUrl.is_active ? "Pause Link" : "Activate Link"}
              icon={shortUrl.is_active ? Icon.Pause : Icon.Play}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              onAction={handleToggleActive}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Copy">
            <Action
              title="Copy Short URL"
              icon={Icon.CopyClipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              onAction={async () => {
                await Clipboard.copy(shortUrl.short_url);
                await showHUD("Short URL copied");
              }}
            />
            <Action
              title="Copy Destination URL"
              icon={Icon.CopyClipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={async () => {
                await Clipboard.copy(shortUrl.original_url);
                await showHUD("Destination URL copied");
              }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Open">
            <Action.OpenInBrowser
              title="Open Short URL"
              url={shortUrl.short_url}
              icon={Icon.Link}
            />
            <Action.OpenInBrowser
              title="Open Destination"
              url={shortUrl.original_url}
              icon={Icon.Globe}
            />
            <Action
              title="View Analytics"
              icon={Icon.BarChart}
              shortcut={{ modifiers: ["cmd"], key: "a" }}
              onAction={() => push(<ShortUrlAnalytics shortUrl={shortUrl} />)}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onRevalidate}
            />
            <Action
              title="Delete Short URL"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={handleDelete}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
