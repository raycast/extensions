import { Action, ActionPanel, Form, Icon, launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { buildShare, HOST_PATTERN, PROTOCOL_LABELS, PROTOCOLS, Protocol, USER_IN_URL_PROTOCOLS } from "../lib/share";
import { DuplicateServerError } from "../lib/storage";

export type ServerFormInput = {
  host: string;
  path: string;
  alias?: string;
  user?: string;
  protocol?: Protocol;
};

type ServerFormProps = {
  initialValues?: ServerFormInput;
  submitTitle: string;
  onSave: (values: ServerFormInput) => Promise<void>;
  // Given the drive it clashed with, so a caller already showing the saved
  // list can just select it. Without one, Manage Drives is opened instead.
  onDuplicate?: (existingId: string) => void | Promise<void>;
};

export function ServerForm({ initialValues, submitTitle, onSave, onDuplicate }: ServerFormProps) {
  const [hostError, setHostError] = useState<string | undefined>();
  const [pathError, setPathError] = useState<string | undefined>();
  const [protocol, setProtocol] = useState<Protocol>(initialValues?.protocol ?? "smb");

  async function handleSubmit(values: { alias: string; host: string; path: string; user?: string; protocol: string }) {
    const host = values.host.trim();
    const path = values.path.trim();
    const alias = values.alias.trim();
    // Absent, not empty, when the field is hidden: Raycast omits unrendered fields.
    const user = (values.user ?? "").trim();
    const protocol = values.protocol as Protocol;

    try {
      buildShare({
        id: "preview",
        host,
        path,
        alias: alias || undefined,
        user: user || undefined,
        protocol,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't save server",
        message: error instanceof Error ? error.message : "Check the host and path.",
      });
      return;
    }

    // Caught here rather than in each caller, so every add and edit reports
    // the clash the same way and leaves the form open to correct.
    try {
      await onSave({
        host,
        path,
        alias: alias || undefined,
        user: user || undefined,
        protocol,
      });
    } catch (error) {
      if (!(error instanceof DuplicateServerError)) throw error;
      await showToast({ title: "Drive already added", message: error.message });
      if (onDuplicate) {
        await onDuplicate(error.existingId);
      } else {
        await launchCommand({
          name: "index",
          type: LaunchType.UserInitiated,
          context: { selectId: error.existingId },
        });
      }
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitTitle} icon={Icon.Checkmark} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="protocol"
        title="Protocol"
        value={protocol}
        onChange={(value) => setProtocol(value as Protocol)}
        info="How this drive is mounted. Live share discovery (Discovered section, Browse Shares on This Host…) only works for SMB."
      >
        {PROTOCOLS.map((option) => (
          <Form.Dropdown.Item key={option} value={option} title={PROTOCOL_LABELS[option]} />
        ))}
      </Form.Dropdown>
      {protocol === "webdav-http" && (
        <Form.Description text="⚠️ Sends credentials and files unencrypted — trusted local networks only." />
      )}
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
        placeholder="e.g. 192.168.1.10 or 192.168.1.10:8443"
        defaultValue={initialValues?.host}
        info="A :port suffix is optional — mainly useful for WebDAV, which often runs on a non-default port. SMB is almost always on its standard port."
        error={hostError}
        onChange={() => setHostError(undefined)}
        onBlur={(event) => {
          const value = (event.target.value ?? "").trim();
          setHostError(value && !HOST_PATTERN.test(value) ? "Invalid IP address or hostname" : undefined);
        }}
      />
      <Form.TextField
        id="path"
        title="Share name or path"
        placeholder="e.g. shared or shared/photos"
        defaultValue={initialValues?.path}
        info="SMB: the share name or nested path. WebDAV: the URL path on the server (e.g. remote.php/dav/files/jane)."
        error={pathError}
        onChange={() => setPathError(undefined)}
        onBlur={(event) => {
          const value = (event.target.value ?? "").trim();
          setPathError(value.length ? undefined : "Required");
        }}
      />
      {USER_IN_URL_PROTOCOLS.has(protocol) ? (
        <Form.TextField
          id="user"
          title="Username (optional)"
          placeholder="e.g. jane"
          defaultValue={initialValues?.user}
          info="Set this so macOS mounts as the same account every time — it's what lets Keychain match a saved password instead of prompting again"
        />
      ) : (
        <Form.Description text="WebDAV doesn't use a username — Keychain matches by server, and any password or certificate prompt happens right here when you connect." />
      )}
    </Form>
  );
}
