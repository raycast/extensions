import http from "http";
import { MenuBarExtra, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";

const DEFAULT_PORT = 17638;

interface HealthData {
  status: string;
  port: number;
  pid: number;
  uptime: number;
  raycastVersion: string;
}

function checkHealth(): Promise<HealthData | null> {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: DEFAULT_PORT,
        path: "/health",
        method: "GET",
        timeout: 2000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => (data += chunk.toString()));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            // Handle new { ok, data } envelope
            resolve(json.ok ? json.data : json);
          } catch {
            resolve(null);
          }
        });
      },
    );
    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
    req.end();
  });
}

export default function StatusCommand() {
  const { data: health, isLoading } = usePromise(checkHealth);

  if (isLoading) {
    return (
      <MenuBarExtra icon="command-icon.png" title="Bridge: ..." isLoading />
    );
  }

  if (!health) {
    return (
      <MenuBarExtra
        icon="command-icon.png"
        title="Bridge: Off"
        tooltip="Raycast Bridge is not running"
      >
        <MenuBarExtra.Item title="Server is not running" />
        <MenuBarExtra.Item
          title="Start Bridge Server"
          onAction={() =>
            open("raycast://extensions/desenmeng/raycast-bridge/start-server")
          }
        />
      </MenuBarExtra>
    );
  }

  return (
    <MenuBarExtra
      icon="command-icon.png"
      title={`Bridge: :${DEFAULT_PORT}`}
      tooltip={`Raycast Bridge on port ${DEFAULT_PORT}`}
    >
      <MenuBarExtra.Item title={`Port: ${DEFAULT_PORT}`} />
      <MenuBarExtra.Item title={`PID: ${health.pid}`} />
      <MenuBarExtra.Item title={`Uptime: ${health.uptime}s`} />
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Stop Server"
          onAction={() =>
            open("raycast://extensions/desenmeng/raycast-bridge/stop-server")
          }
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
