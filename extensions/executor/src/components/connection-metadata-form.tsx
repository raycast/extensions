import { workspaceTitle } from "../lib/workspaces";
import { WorkspaceAction } from "./workspace-command";
import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useRef, useState } from "react";
import { request } from "../lib/client";
import type { Connection } from "../lib/types";

interface Values {
  identityLabel: string;
  description: string;
}

function connectionPath(connection: Connection): string {
  return `/api/connections/${encodeURIComponent(connection.owner)}/${encodeURIComponent(connection.integration)}/${encodeURIComponent(connection.name)}`;
}

export function ConnectionMetadataForm({
  connection,
  onSaved,
}: {
  connection: Connection;
  onSaved?: (connection: Connection) => void;
}) {
  const { pop } = useNavigation();
  const saving = useRef(false);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(values: Values) {
    if (saving.current) return;
    saving.current = true;
    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Saving Connection Details" });
    try {
      const updated = await request<Connection>(connectionPath(connection), {
        method: "PATCH",
        body: JSON.stringify({
          identityLabel: values.identityLabel.trim() || null,
          description: values.description.trim() || null,
        }),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Connection Details Saved";
      onSaved?.(updated);
      pop();
    } catch (error) {
      toast.hide();
      await showFailureToast(error, { title: "Could Not Save Connection Details" });
    } finally {
      saving.current = false;
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={workspaceTitle(`Edit ${connection.identityLabel || connection.name}`)}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Connection Details" icon={Icon.Check} onSubmit={onSubmit} />
          <WorkspaceAction />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="identityLabel"
        title="Label"
        defaultValue={connection.identityLabel ?? ""}
        placeholder={connection.name}
        info="Shown in Executor and Raycast. This does not change the connection address."
      />
      <Form.TextArea
        id="description"
        title="Description"
        defaultValue={connection.description ?? ""}
        placeholder="What this account is used for"
      />
    </Form>
  );
}
