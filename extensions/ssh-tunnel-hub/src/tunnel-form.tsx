import {
  Action,
  ActionPanel,
  Form,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import {
  Tunnel,
  addTunnel,
  newId,
  portConflict,
  updateTunnel,
} from "./lib/store";
import { getStatus, restartTunnel } from "./lib/process";

type Props = {
  tunnel?: Tunnel;
  onSave: () => void;
};

type Values = {
  name: string;
  localPort: string;
  remoteHost: string;
  remotePort: string;
  sshTarget: string;
  sshPort: string;
  compression: boolean;
  autoReconnect: boolean;
  extraArgs: string;
};

export default function TunnelForm({ tunnel, onSave }: Props) {
  const { pop } = useNavigation();
  const isEdit = Boolean(tunnel);
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>(
    {},
  );

  function setError(field: keyof Values, message?: string) {
    setErrors((prev) => ({ ...prev, [field]: message }));
  }

  async function handleSubmit(values: Values) {
    const next: Partial<Record<keyof Values, string>> = {};

    if (!values.name.trim()) next.name = "Beri nama supaya mudah dikenali";
    if (!values.sshTarget.trim())
      next.sshTarget = "Isi user@host atau alias dari ~/.ssh/config";

    for (const field of ["localPort", "remotePort"] as const) {
      const raw = values[field].trim();
      const num = Number(raw);
      if (!raw) next[field] = "Wajib diisi";
      else if (!/^\d+$/.test(raw) || num < 1 || num > 65535)
        next[field] = "Port harus 1–65535";
    }
    if (values.sshPort.trim() && !/^\d+$/.test(values.sshPort.trim())) {
      next.sshPort = "Port harus berupa angka";
    }

    const localPort = Number(values.localPort);
    const clash = portConflict(localPort, tunnel?.id);
    if (!next.localPort && clash)
      next.localPort = `Port ini sudah dipakai "${clash.name}"`;

    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    const record: Tunnel = {
      id: tunnel?.id ?? newId(),
      name: values.name.trim(),
      localPort,
      remoteHost: values.remoteHost.trim() || "localhost",
      remotePort: Number(values.remotePort),
      sshTarget: values.sshTarget.trim(),
      sshPort: values.sshPort.trim() ? Number(values.sshPort) : undefined,
      compression: values.compression || undefined,
      autoReconnect: values.autoReconnect || undefined,
      extraArgs: values.extraArgs.trim() || undefined,
    };

    const wasRunning = tunnel ? getStatus(tunnel) === "running" : false;

    if (isEdit) updateTunnel(record.id, record);
    else addTunnel(record);

    // Perubahan tidak berlaku pada proses yang sudah jalan, jadi jalankan ulang
    // dengan pengaturan baru.
    if (wasRunning) {
      try {
        await restartTunnel(record);
      } catch (err) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Tersimpan, tapi tunnel gagal berjalan",
          message: err instanceof Error ? err.message : String(err),
        });
        onSave();
        pop();
        return;
      }
    }

    await showToast({
      style: Toast.Style.Success,
      title: isEdit
        ? `${record.name} diperbarui`
        : `${record.name} ditambahkan`,
    });
    onSave();
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEdit ? "Save Changes" : "Add Tunnel"}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Nama"
        placeholder="Database staging"
        defaultValue={tunnel?.name}
        error={errors.name}
        onChange={() => setError("name", undefined)}
      />
      <Form.TextField
        id="localPort"
        title="Port lokal"
        placeholder="5433"
        info="Port di mesin ini yang akan diteruskan ke server."
        defaultValue={tunnel ? String(tunnel.localPort) : undefined}
        error={errors.localPort}
        onChange={() => setError("localPort", undefined)}
      />
      <Form.TextField
        id="remoteHost"
        title="Host tujuan"
        placeholder="localhost"
        info="Dilihat dari sisi server. Kosongkan untuk localhost."
        defaultValue={tunnel?.remoteHost}
      />
      <Form.TextField
        id="remotePort"
        title="Port tujuan"
        placeholder="5432"
        defaultValue={tunnel ? String(tunnel.remotePort) : undefined}
        error={errors.remotePort}
        onChange={() => setError("remotePort", undefined)}
      />

      <Form.Separator />

      <Form.TextField
        id="sshTarget"
        title="Server SSH"
        placeholder="user@host atau alias"
        defaultValue={tunnel?.sshTarget}
        error={errors.sshTarget}
        onChange={() => setError("sshTarget", undefined)}
      />
      <Form.TextField
        id="sshPort"
        title="Port SSH"
        placeholder="22"
        defaultValue={tunnel?.sshPort ? String(tunnel.sshPort) : undefined}
        error={errors.sshPort}
        onChange={() => setError("sshPort", undefined)}
      />
      <Form.Checkbox
        id="compression"
        title="Koneksi"
        label="Aktifkan SSH compression (-C)"
        info="Berguna untuk koneksi lambat atau data teks besar, tapi bisa menambah beban CPU."
        defaultValue={Boolean(tunnel?.compression)}
      />
      <Form.Checkbox
        id="autoReconnect"
        title="Background"
        label="Auto reconnect saat tunnel berhenti"
        info="Raycast akan mengecek tunnel ini di background sekitar tiap 1 menit. Jadwal bisa tertunda oleh penghematan energi macOS."
        defaultValue={Boolean(tunnel?.autoReconnect)}
      />
      <Form.TextField
        id="extraArgs"
        title="Argumen tambahan"
        placeholder="-i ~/.ssh/id_ed25519"
        info="Opsional. Dipisah dengan spasi."
        defaultValue={tunnel?.extraArgs}
      />
      <Form.Description text="Autentikasi memakai kunci SSH. Server yang meminta password tidak bisa dipakai karena tidak ada tempat mengetiknya." />
    </Form>
  );
}
