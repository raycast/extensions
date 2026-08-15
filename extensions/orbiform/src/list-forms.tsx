import { useEffect } from "react";
import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { listForms } from "./lib/api";

export default function Command() {
  const { isLoading, data, error, revalidate } = usePromise(listForms);

  useEffect(() => {
    if (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to load forms", message: error.message });
    }
  }, [error]);

  const forms = data ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search forms...">
      {!isLoading && forms.length === 0 ? (
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
