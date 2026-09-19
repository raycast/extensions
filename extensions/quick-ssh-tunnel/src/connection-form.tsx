import {
  Action,
  ActionPanel,
  Form,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { connectionKey, validateConnection } from "./lib/core";
import { getStatus, startTunnel, stopTunnel } from "./lib/process";
import {
  Connection,
  findConnectionByKey,
  loadConnections,
  newId,
  saveConnection,
} from "./lib/store";

type Props = {
  initial?: Connection;
  prefillSshTarget?: string;
  onConnected: () => void;
};

type Values = {
  mode: "forward" | "socks5";
  sshTarget: string;
  port: string;
  remoteHost: string;
  compression: boolean;
};

export default function ConnectionForm({
  initial,
  prefillSshTarget,
  onConnected,
}: Props) {
  const { pop } = useNavigation();
  const [mode, setMode] = useState<"forward" | "socks5">(
    initial?.mode ?? "forward",
  );
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>(
    {},
  );

  async function submit(values: Values) {
    const connection: Connection = {
      id: initial?.id ?? newId(),
      mode: values.mode,
      sshTarget: values.sshTarget.trim(),
      port: Number(values.port.trim()),
      remoteHost: values.remoteHost?.trim() || "127.0.0.1",
      compression: values.compression,
      lastUsedAt: Date.now(),
    };
    const validation = validateConnection(connection);
    if (validation.length > 0) {
      setErrors({
        sshTarget: validation.find((error) => error.startsWith("SSH")),
        port: validation.find((error) => error.startsWith("Port")),
        remoteHost: validation.find((error) => error.startsWith("Remote")),
      });
      return;
    }

    const existing = findConnectionByKey(connectionKey(connection));
    if (existing) connection.id = existing.id;
    const conflict = loadConnections().find(
      (item) =>
        item.id !== connection.id &&
        item.port === connection.port &&
        getStatus(item) === "running",
    );
    if (conflict) {
      setErrors({ port: `Port sedang dipakai oleh ${conflict.sshTarget}` });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Menghubungkan SSH",
    });
    try {
      if (initial && getStatus(initial) === "running") {
        await stopTunnel(initial);
      }
      await startTunnel(connection);
      saveConnection(connection);
      toast.style = Toast.Style.Success;
      toast.title = "Tunnel aktif";
      toast.message = `localhost:${connection.port}`;
      onConnected();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Tunnel gagal terhubung";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <Form
      navigationTitle={initial ? "Edit Connection" : "New Connection"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Connect" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="mode"
        title="Tunnel Type"
        value={mode}
        onChange={(value) => setMode(value as "forward" | "socks5")}
      >
        <Form.Dropdown.Item value="forward" title="Local Port Forwarding" />
        <Form.Dropdown.Item value="socks5" title="SOCKS5 Proxy" />
      </Form.Dropdown>
      <Form.TextField
        id="sshTarget"
        title="SSH Target"
        placeholder="user@host atau alias ~/.ssh/config"
        defaultValue={initial?.sshTarget ?? prefillSshTarget}
        error={errors.sshTarget}
        onChange={() =>
          setErrors((current) => ({ ...current, sshTarget: undefined }))
        }
      />
      <Form.TextField
        id="port"
        title="Port"
        placeholder="5432"
        info="Port lokal dan remote menggunakan nomor yang sama."
        defaultValue={initial ? String(initial.port) : undefined}
        error={errors.port}
        onChange={() =>
          setErrors((current) => ({ ...current, port: undefined }))
        }
      />
      {mode === "forward" && (
        <Form.TextField
          id="remoteHost"
          title="Remote Host"
          placeholder="127.0.0.1"
          info="Host ini dilihat dari sisi server SSH."
          defaultValue={initial?.remoteHost ?? "127.0.0.1"}
          error={errors.remoteHost}
          onChange={() =>
            setErrors((current) => ({ ...current, remoteHost: undefined }))
          }
        />
      )}
      <Form.Checkbox
        id="compression"
        title="Compression"
        label="Enable SSH compression"
        defaultValue={initial?.compression ?? true}
      />
      <Form.Description text="SOCKS5 membuka proxy di localhost:port. Authentication memakai ~/.ssh/config dan ssh-agent. Password tidak didukung." />
    </Form>
  );
}
