import { ActionPanel, Action, Form, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import net from "net";

function isValidIpInput(value: string) {
  return /^[0-9.]*$/.test(value);
}

function isValidIpFormat(value: string) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(value);
}

async function scanPort(ip: string, port: number, timeout = 300) {
  return new Promise<boolean>((resolve) => {
    const socket = new net.Socket();
    let isOpen = false;
    socket.setTimeout(timeout);
    socket.once("connect", () => {
      isOpen = true;
      socket.destroy();
    });
    socket.once("timeout", () => socket.destroy());
    socket.once("error", () => socket.destroy());
    socket.once("close", () => resolve(isOpen));
    socket.connect(port, ip);
  });
}

export default function PortScanner() {
  const [openPorts, setOpenPorts] = useState<number[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [ip, setIp] = useState("");
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit(values: { ip: string }) {
    setLoading(true);
    setOpenPorts(null);
    await showToast({ title: "Scansione in corso...", style: Toast.Style.Animated });

    const portsToScan = Array.from({ length: 1024 }, (_, i) => i + 1);
    const results = await Promise.all(
      portsToScan.map(async (port) => ((await scanPort(values.ip, port)) ? port : null)),
    );
    const found = results.filter((p): p is number => p !== null);

    setOpenPorts(found);
    setLoading(false);

    if (found.length === 0) {
      await showToast({ title: "Nessuna porta aperta trovata", style: Toast.Style.Failure });
    } else {
      await showToast({
        title: "Scansione completata",
        message: `${found.length} porte aperte`,
        style: Toast.Style.Success,
      });
    }
  }

  if (openPorts) {
    return (
      <List isLoading={loading} navigationTitle="Porte Aperte">
        {openPorts.map((port) => (
          <List.Item key={port} title={`Porta ${port}`} />
        ))}
      </List>
    );
  }

  return (
    <Form
      navigationTitle="Scanner Porte"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Scansiona" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="ip"
        title="Indirizzo IP"
        placeholder="192.168.1.1"
        value={ip}
        onChange={(value) => {
          if (!isValidIpInput(value)) return;
          setIp(value);
          if (value.length === 0) setError(undefined);
          else if (!isValidIpFormat(value)) setError("Inserisci un IP valido (solo numeri e punti)");
          else setError(undefined);
        }}
        error={error}
      />
    </Form>
  );
}
