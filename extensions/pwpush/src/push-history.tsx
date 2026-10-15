import { ActionPanel, Action, Clipboard, Icon, List, Toast, getPreferenceValues, open, showToast } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { loadHistory, removeFromHistory, type PushRecord } from "./utils/history";
import { resolveApiKeyForRecord, serverUrlsMatch } from "./utils/credentials";
import { expirePush } from "./utils/pwpush";

export default function PushHistoryCommand() {
  const preferences = getPreferenceValues<Preferences>();
  const { data: history, isLoading, revalidate } = useCachedPromise(loadHistory, []);

  async function removeAndExpire(record: PushRecord) {
    if (!serverUrlsMatch(record.serverUrl, preferences)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Server URL mismatch",
        message: "Set the extension Server URL to match this push before expiring it remotely.",
      });
      return;
    }

    try {
      const apiKey = resolveApiKeyForRecord(record.serverUrl, preferences);
      await expirePush(record.serverUrl, apiKey, record.urlToken);
      await removeFromHistory(record.urlToken, record.serverUrl);
      await showToast({ style: Toast.Style.Success, title: "Push expired" });
      revalidate();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to expire push" });
    }
  }

  async function removeOnly(record: PushRecord) {
    await removeFromHistory(record.urlToken, record.serverUrl);
    revalidate();
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search recent pushes">
      <List.EmptyView
        title="No pushes yet"
        description="Create a push from the Create Push command and it will appear here."
      />
      {history?.map((record) => (
        <List.Item
          key={`${record.urlToken}|${record.serverUrl}`}
          title={record.name || `Push ${record.urlToken}`}
          subtitle={record.kind.toUpperCase()}
          accessories={[
            { text: record.viewsRemaining !== undefined ? `${record.viewsRemaining} views left` : undefined },
            { text: record.expiresAt ? new Date(record.expiresAt).toLocaleString() : undefined },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Copy URL"
                icon={Icon.Clipboard}
                onAction={() => Clipboard.copy(record.url, { concealed: true })}
              />
              <Action title="Open in Browser" icon={Icon.Globe} onAction={() => open(record.url)} />
              <Action title="Expire Push" icon={Icon.Trash} onAction={() => removeAndExpire(record)} />
              <Action title="Remove from History" icon={Icon.XMarkCircle} onAction={() => removeOnly(record)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
