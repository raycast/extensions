import {
  MenuBarExtra,
  Icon,
  open,
  showHUD,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { execSync } from "child_process";

interface PortInfo {
  port: number;
  pid: number;
  command: string;
  isVite: boolean;
}

function getActivePorts(): PortInfo[] {
  try {
    const output = execSync(
      "/usr/sbin/lsof -iTCP -sTCP:LISTEN -P -n 2>/dev/null | tail -n +2",
      {
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, PATH: "/usr/sbin:/usr/bin:/bin:/sbin" },
      },
    );

    const lines = output.trim().split("\n").filter(Boolean);
    const portMap = new Map<string, PortInfo>();

    for (const line of lines) {
      const parts = line.split(/\s+/);
      if (parts.length < 9) continue;

      const command = parts[0];
      const pid = parseInt(parts[1], 10);
      const name = parts[8];

      const portMatch = name.match(/:(\d+)$/);
      if (!portMatch) continue;

      const port = parseInt(portMatch[1], 10);
      const key = `${port}-${pid}`;

      if (portMap.has(key)) continue;

      let fullCommand = command;
      try {
        fullCommand =
          execSync(`/bin/ps -p ${pid} -o args= 2>/dev/null`, {
            encoding: "utf-8",
          }).trim() || command;
      } catch {
        // ignore
      }

      const isVite = /vite|@vitejs/.test(fullCommand.toLowerCase());

      portMap.set(key, { port, pid, command: fullCommand, isVite });
    }

    return Array.from(portMap.values()).sort((a, b) => a.port - b.port);
  } catch {
    return [];
  }
}

function killProcess(pid: number, port: number) {
  try {
    execSync(`kill -9 ${pid} 2>/dev/null`);
    showHUD(`Killed process on port ${port}`);
  } catch {
    showHUD(`Failed to kill process on port ${port}`);
  }
}

export default function Command() {
  const ports = getActivePorts();
  const count = ports.length;

  return (
    <MenuBarExtra
      icon={Icon.Network}
      title={count > 0 ? `${count}` : undefined}
    >
      {count === 0 ? (
        <MenuBarExtra.Item title="No active ports" />
      ) : (
        <>
          <MenuBarExtra.Section title="Active Ports">
            {ports.slice(0, 10).map((info) => (
              <MenuBarExtra.Submenu
                key={`${info.port}-${info.pid}`}
                title={`:${info.port}${info.isVite ? " (Vite)" : ""}`}
                icon={info.isVite ? Icon.Bolt : Icon.Globe}
              >
                <MenuBarExtra.Item
                  title="Visit in Browser"
                  icon={Icon.Globe}
                  onAction={() => open(`http://localhost:${info.port}`)}
                />
                <MenuBarExtra.Item
                  title="Kill Process"
                  icon={Icon.XMarkCircle}
                  onAction={() => killProcess(info.pid, info.port)}
                />
                <MenuBarExtra.Item
                  title={`PID: ${info.pid}`}
                  icon={Icon.Terminal}
                />
              </MenuBarExtra.Submenu>
            ))}
          </MenuBarExtra.Section>
          {ports.length > 10 && (
            <MenuBarExtra.Item
              title={`+${ports.length - 10} more...`}
              icon={Icon.Ellipsis}
            />
          )}
        </>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Full View"
          icon={Icon.AppWindowList}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() =>
            launchCommand({ name: "index", type: LaunchType.UserInitiated })
          }
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
