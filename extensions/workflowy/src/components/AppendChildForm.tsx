import { Action, ActionPanel, Form, popToRoot, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { appendChild } from "../lib/api";
import { insertNodeOptimistically } from "../lib/cache";
import { getPreferences } from "../lib/preferences";
import type { CaptureType } from "../lib/nodes";

interface Props {
  parentId: string;
  onDidCreate?: () => void;
  returnToRootOnSuccess?: boolean;
}

export function AppendChildForm({ parentId, onDidCreate, returnToRootOnSuccess = true }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const preferences = getPreferences();
  const { pop } = useNavigation();

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Child Item"
            onSubmit={async (values: { text: string; note?: string; type: string }) => {
              const text = values.text?.trim();
              if (!text) {
                await showToast({ style: Toast.Style.Failure, title: "Enter some text" });
                return;
              }

              try {
                setIsLoading(true);
                const result = await appendChild(preferences.apiKey, parentId, {
                  text,
                  note: values.note?.trim() || undefined,
                  position: preferences.capturePosition,
                  type: (values.type as CaptureType) || "bullet",
                });

                if (result.id) {
                  insertNodeOptimistically({
                    id: result.id,
                    name: text,
                    note: values.note?.trim() || null,
                    parentId: result.parentId,
                  });
                }

                onDidCreate?.();
                await showToast({ style: Toast.Style.Success, title: "Added child item" });
                if (returnToRootOnSuccess) {
                  await popToRoot();
                } else {
                  await pop();
                }
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not add child item",
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
      <Form.TextArea id="text" placeholder="Task or note..." />
      <Form.TextArea id="note" placeholder="Optional note" />
      <Form.Dropdown id="type" title="Type" defaultValue="bullet">
        <Form.Dropdown.Item value="bullet" title="Bullet" />
        <Form.Dropdown.Item value="todo" title="Todo" />
      </Form.Dropdown>
    </Form>
  );
}
