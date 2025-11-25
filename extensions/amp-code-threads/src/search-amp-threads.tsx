import {
  ActionPanel,
  Action,
  Icon,
  List,
  getPreferenceValues,
  showToast,
  Toast,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

interface Preferences {
  sessionToken: string;
}

interface Thread {
  id: string;
  title: string;
  created: number;
  updatedAt: string;
  messageCount: number;
  firstUserMessageContent?: { text: string; type: string }[];
  env?: {
    initial?: {
      trees?: {
        displayName: string;
        uri: string;
        repository?: { url: string };
      }[];
    };
  };
  summaryStats?: {
    messageCount: number;
    humanMessageCount: number;
    diffStats?: { added: number; changed: number; deleted: number };
  };
}

interface ThreadsResponse {
  threads: Thread[];
  hasMore: boolean;
}

const PAGE_SIZE = 15;

async function fetchThreads(sessionToken: string, offset: number): Promise<ThreadsResponse> {
  const response = await fetch(`https://ampcode.com/api/threads/feed?offset=${offset}`, {
    headers: {
      Cookie: `session=${sessionToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function Command() {
  const { sessionToken } = getPreferenceValues<Preferences>();

  const { isLoading, data, error, pagination } = useCachedPromise(
    (token: string) => async (options: { page: number }) => {
      const offset = options.page * PAGE_SIZE;
      const result = await fetchThreads(token, offset);
      return {
        data: result.threads,
        hasMore: result.hasMore,
      };
    },
    [sessionToken],
    {
      execute: !!sessionToken,
      onError: (err) => {
        if (err.message.includes("401") || err.message.includes("403")) {
          showToast({
            style: Toast.Style.Failure,
            title: "Invalid session token",
            message: "Please update your session token in preferences",
            primaryAction: {
              title: "Open Preferences",
              onAction: () => openExtensionPreferences(),
            },
          });
        }
      },
    },
  );

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to load threads"
          description="Check your session token in extension preferences"
          actions={
            <ActionPanel>
              <Action title="Open Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const threads = data ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search threads..." pagination={pagination}>
      {threads.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="No threads found" />
      ) : (
        threads.map((thread) => {
          const workspaceName = thread.env?.initial?.trees?.[0]?.displayName ?? "Unknown workspace";
          const updatedAt = new Date(thread.updatedAt);

          return (
            <List.Item
              key={thread.id}
              icon={Icon.Message}
              title={thread.title || "Untitled Thread"}
              subtitle={workspaceName}
              accessories={[
                { icon: Icon.Bubble, text: `${thread.messageCount}` },
                { text: formatRelativeTime(updatedAt) },
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Thread Command" content={`amp threads continue ${thread.id}`} />
                  <Action.OpenInBrowser title="Open in Browser" url={`https://ampcode.com/threads/${thread.id}`} />
                  <Action.CopyToClipboard
                    title="Copy Thread URL"
                    content={`https://ampcode.com/threads/${thread.id}`}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
