import { Action, ActionPanel, Form, showToast, Toast, popToRoot } from "@raycast/api";
import { useState } from "react";
import { saveBookmark } from "../lib/cache";

interface Props {
  nodeId: string;
  defaultName: string;
}

export function SaveBookmarkForm({ nodeId, defaultName }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save as Bookmark"
            onSubmit={async (values: { name: string; note?: string }) => {
              const name = values.name?.trim();
              if (!name) {
                await showToast({ style: Toast.Style.Failure, title: "Enter a bookmark name" });
                return;
              }

              try {
                setIsLoading(true);
                saveBookmark(name, nodeId, values.note?.trim() || null);
                await showToast({ style: Toast.Style.Success, title: "Saved as bookmark" });
                await popToRoot();
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not save bookmark",
                  message: error instanceof Error ? error.message : String(error),
                });
              } finally {
                setIsLoading(false);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" placeholder="Bookmark name" defaultValue={defaultName} />
      <Form.TextArea id="note" placeholder="Optional note for this bookmark" />
    </Form>
  );
}
