import { useEffect } from "react";
import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { listForms } from "./lib/api";
import { OrbiformAuthError, reconnect } from "./lib/oauth";

export default function Command() {
  const { isLoading, data, error, revalidate } = usePromise(listForms);

  useEffect(() => {
    if (error) {
      const isAuthError = error instanceof OrbiformAuthError;
      showToast({
        style: Toast.Style.Failure,
        title: isAuthError ? "Orbiform session expired" : "Failed to load forms",
        message: error.message,
        primaryAction: isAuthError
          ? {
              title: "Reconnect Orbiform",
              onAction: async () => {
                await reconnect();
                revalidate();
              },
            }
          : undefined,
      });
    }
  }, [error]);

  const forms = data ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search forms...">
      {!isLoading && error instanceof OrbiformAuthError ? (
        <List.EmptyView
          title="Orbiform session expired"
          description="Reconnect your Orbiform account to keep using this command."
          actions={
            <ActionPanel>
              <Action
                title="Reconnect Orbiform"
                icon={Icon.Repeat}
                onAction={async () => {
                  await reconnect();
                  revalidate();
                }}
              />
            </ActionPanel>
          }
        />
      ) : !isLoading && forms.length === 0 ? (
        <List.EmptyView title="No forms found" description="You don't have any forms in Orbiform yet." />
      ) : (
        forms.map((form) => (
          <List.Item
            key={form.id}
            title={form.title}
            subtitle={`${form.responseCount} responses`}
            accessories={[{ date: new Date(form.createdAt) }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Browser" url={form.publicUrl} />
                <Action.CopyToClipboard
                  title="Copy Link"
                  content={form.publicUrl}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
