import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import net from "net";

export default function PortScanner() {
  const [host, setHost] = useState("localhost");
  const [ports, setPorts] = useState("");
  const [results, setResults] = useState<string[]>([]);

  const scanPort = async (port: number): Promise<string> => {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(1000);

      socket.on("connect", () => {
        socket.destroy();
        resolve(`✅ Port ${port} is open`);
      });

      socket.on("timeout", () => {
        socket.destroy();
        resolve(`❌ Port ${port} timed out`);
      });

      socket.on("error", () => {
        resolve(`❌ Port ${port} is closed`);
      });

      socket.connect(port, host);
    });
  };

  const startScan = async () => {
    const portsToScan = ports.split(",").flatMap((p) => {
      const range = p.split("-").map((n) => parseInt(n.trim()));
      if (range.length === 2) {
        return Array.from({ length: range[1] - range[0] + 1 }, (_, i) => range[0] + i);
      }
      return [parseInt(p.trim())];
    });

    if (portsToScan.some(isNaN)) {
      showToast({ style: Toast.Style.Failure, title: "Invalid port numbers" });
      return;
    }

    const scanResults = [];
    for (const port of portsToScan) {
      scanResults.push(await scanPort(port));
    }
    setResults(scanResults);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Scan" onSubmit={startScan} />
        </ActionPanel>
      }
    >
      <Form.TextField id="host" title="Host" value={host} onChange={setHost} />
      <Form.TextField
        id="ports"
        title="Ports/Ranges"
        placeholder="Ex: 80, 443, 8000-9000"
        value={ports}
        onChange={setPorts}
      />
      {results.length > 0 && (
        <>
          <Form.Separator />
          <Form.Description text={results.join("\n")} />
        </>
      )}
    </Form>
  );
}
