import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { buildShare } from "../lib/share";

export type ServerFormInput = {
  host: string;
  path: string;
  alias?: string;
  user?: string;
};

type ServerFormProps = {
  initialValues?: ServerFormInput;
  submitTitle: string;
  onSave: (values: ServerFormInput) => Promise<void>;
};

export function ServerForm({
  initialValues,
  submitTitle,
  onSave,
}: ServerFormProps) {
  const [hostError, setHostError] = useState<string | undefined>();
  const [pathError, setPathError] = useState<string | undefined>();

  async function handleSubmit(values: {
    alias: string;
    host: string;
    path: string;
    user: string;
  }) {
    const host = values.host.trim();
    const path = values.path.trim();
    const alias = values.alias.trim();
    const user = values.user.trim();

    try {
      buildShare({
        id: "preview",
        host,
        path,
        alias: alias || undefined,
        user: user || undefined,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't save server",
        message:
          error instanceof Error ? error.message : "Check the host and path.",
      });
      return;
    }

    await onSave({
      host,
      path,
      alias: alias || undefined,
      user: user || undefined,
    });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitTitle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="alias"
        title="Alias (optional)"
        placeholder="e.g. media-server"
        defaultValue={initialValues?.alias}
        info="Shown in Manage SMB Servers and in toasts instead of the IP address. Defaults to the last part of the share path if left blank."
      />
      <Form.TextField
        id="host"
        title="IP address or hostname"
        placeholder="e.g. 192.168.1.10"
        defaultValue={initialValues?.host}
        error={hostError}
        onChange={() => setHostError(undefined)}
        onBlur={(event) => {
          const value = (event.target.value ?? "").trim();
          setHostError(
            value && !/^[A-Za-z0-9.-]+$/.test(value)
              ? "Invalid IP address or hostname"
              : undefined,
          );
        }}
      />
      <Form.TextField
        id="path"
        title="Share name or path"
        placeholder="e.g. shared or shared/photos"
        defaultValue={initialValues?.path}
        info="Just the share name, or a nested path like share/sub/folder"
        error={pathError}
        onChange={() => setPathError(undefined)}
        onBlur={(event) => {
          const value = (event.target.value ?? "").trim();
          setPathError(value.length ? undefined : "Required");
        }}
      />
      <Form.TextField
        id="user"
        title="Username (optional)"
        placeholder="e.g. jane"
        defaultValue={initialValues?.user}
        info="Set this so macOS mounts as the same account every time — it's what lets Keychain match a saved password instead of prompting again"
      />
    </Form>
  );
}
