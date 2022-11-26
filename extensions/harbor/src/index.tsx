import { useMemo } from "react";
import { MenuBarExtra, Clipboard, Color, getPreferenceValues, Icon } from "@raycast/api";
import { useLsof, Process, useProcSections } from "./procs";
import { execSync } from "child_process";
import { formatConnection, formatTitle, getCmdDisplayInfo, truncate } from "./formatters";

type Preferences = {
  hideByArgs: string;
};

export default function Command() {
  const { hideByArgs } = getPreferenceValues<Preferences>();
  const { procs, isLoading } = useLsof();
  const title = useMemo(() => {
    return formatTitle(procs, hideByArgs.split(","));
  }, [procs]);
  const { shownNodeProcs, hiddenNodeProcs, otherLocalProcs, otherExternalProcs } = useProcSections(procs);

  return (
    <MenuBarExtra icon={Icon.Boat} isLoading={isLoading} title={title}>
      {shownNodeProcs.map((proc) => (
        <ProcSubMenu key={proc.pid} proc={proc} />
      ))}
      <MenuBarExtra.Section>
        <MenuBarExtra.Submenu title="Other ports exposed locally" icon={Icon.Ellipsis}>
          {otherLocalProcs.map((proc) => (
            <ProcSubMenu key={proc.pid} proc={proc} />
          ))}
        </MenuBarExtra.Submenu>
        <MenuBarExtra.Submenu title="Other ports exposed externally" icon={Icon.Ellipsis}>
          {otherExternalProcs.map((proc) => (
            <ProcSubMenu key={proc.pid} proc={proc} />
          ))}
        </MenuBarExtra.Submenu>
        <MenuBarExtra.Submenu title="Hidden" icon={Icon.Ellipsis}>
          {hiddenNodeProcs.map((proc) => (
            <ProcSubMenu key={proc.pid} proc={proc} />
          ))}
        </MenuBarExtra.Submenu>
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

const ProcSubMenu = (props: { proc: Process }) => {
  const { proc } = props;
  const displayInfo = getCmdDisplayInfo(proc);
  return (
    <MenuBarExtra.Submenu title={displayInfo.label} icon={displayInfo.icon}>
      <MenuBarExtra.Section title="Command">
        <MenuBarExtra.Item
          icon={{ source: Icon.Terminal, tintColor: Color.Green }}
          title={proc.args ? truncate(proc.args) : "No args"}
          tooltip={proc.args}
          onAction={
            proc.args
              ? () => {
                  Clipboard.copy(proc.args ?? "");
                }
              : undefined
          }
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Working directory">
        <MenuBarExtra.Item
          icon={{ source: Icon.Folder, tintColor: Color.Green }}
          title={proc.cwd ? truncate(proc.cwd) : "No cwd"}
          tooltip={proc.cwd}
          onAction={
            proc.cwd
              ? () => {
                  Clipboard.copy(proc.cwd ?? "");
                }
              : undefined
          }
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title={`Actions · pid ${proc.pid}`}>
        <MenuBarExtra.Item
          title="Terminate"
          onAction={() => {
            execSync(`kill ${proc.pid}`, { killSignal: "SIGTERM", timeout: 2000 });
          }}
        />
        <MenuBarExtra.Item
          title="Kill"
          onAction={() => {
            execSync(`kill -9 ${proc.pid}`, { killSignal: "SIGKILL", timeout: 2000 });
          }}
        />
      </MenuBarExtra.Section>
      {proc.connections.length > 0 ? (
        <MenuBarExtra.Section title="Connections (click to copy)">
          {proc.connections.map((conn, i) => (
            <MenuBarExtra.Item
              key={`${i}_${conn.protocol}_${conn.localAddress}:${conn.localPort},${conn.remoteAddress}:${conn.remotePort}`}
              tooltip={JSON.stringify(conn, null, 2)}
              title={formatConnection(conn)}
              onAction={() => {
                Clipboard.copy(formatConnection(conn));
              }}
            />
          ))}
        </MenuBarExtra.Section>
      ) : null}
    </MenuBarExtra.Submenu>
  );
};
