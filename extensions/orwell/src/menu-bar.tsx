import { MenuBarExtra, Icon, open, showHUD, launchCommand, LaunchType } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { detectServers, stopServer } from "./lib/index";
import { spawn } from "node:child_process";

export default function Command() {
  const { data: servers, isLoading, revalidate } = useCachedPromise(async () => await detectServers(), []);

  const online = (servers ?? []).filter((s) => s.status === "online");
  const offline = (servers ?? []).filter((s) => s.status === "offline");

  return (
    <MenuBarExtra
      icon="command-icon.png"
      title={online.length > 0 ? `${online.length}` : undefined}
      tooltip="Orwell: watching your dev servers"
      isLoading={isLoading}
    >
      {online.length === 0 && !isLoading && (
        <MenuBarExtra.Item title="No dev servers running" icon={Icon.XMarkCircle} />
      )}

      {online.length > 0 && (
        <MenuBarExtra.Section title="Running">
          {online.map((server) => (
            <MenuBarExtra.Submenu
              key={server.projectDir}
              icon={server.faviconPath ? { source: server.faviconPath } : Icon.Globe}
              title={`${server.projectName}  :${server.port}`}
            >
              <MenuBarExtra.Item title="Open in Browser" icon={Icon.Globe} onAction={() => open(server.url)} />
              <MenuBarExtra.Item
                title="Open in Finder"
                icon={Icon.Finder}
                onAction={() => spawn("open", [server.projectDir])}
              />
              <MenuBarExtra.Item
                title="Stop"
                icon={Icon.Power}
                onAction={async () => {
                  await stopServer(server);
                  await showHUD(`Stopped ${server.projectName}`);
                  setTimeout(revalidate, 1500);
                }}
              />
            </MenuBarExtra.Submenu>
          ))}
        </MenuBarExtra.Section>
      )}

      {offline.length > 0 && (
        <MenuBarExtra.Section title={`Offline (${offline.length})`}>
          {offline.map((server) => (
            <MenuBarExtra.Item key={server.projectDir} title={server.projectName} icon={Icon.CircleDisabled} />
          ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Orwell"
          icon={Icon.AppWindowList}
          onAction={() => launchCommand({ name: "orwell", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
