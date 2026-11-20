import { Color, Icon, launchCommand, LaunchType, MenuBarExtra, open, openExtensionPreferences } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { Action, Daemon, daemonActions, daemonUrl, isSupervisorDown, nameOf, namespaceOf } from "./model";
import { listDaemons, MissingBinaryError, startSupervisor } from "./pitchfork";
import { ACTION_ICON, runAction, statusIcon, VERB } from "./ui";

export default function Command() {
  const { data, error, isLoading, revalidate } = useCachedPromise(listDaemons, [], { onError: () => {} });
  const daemons = error ? [] : (data ?? []);
  const running = daemons.filter((d) => d.status === "running").length;
  const namespaces = [...new Set(daemons.map(namespaceOf))].sort();

  async function act(action: Action, daemon: Daemon) {
    await runAction(action, [daemon.id], nameOf(daemon));
    revalidate();
  }

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{ source: "menu-bar.png", tintColor: Color.PrimaryText }}
      title={error ? undefined : String(running)}
      tooltip={error ? "Pitchfork" : `${running} of ${daemons.length} Pitchfork daemons running`}
    >
      {error instanceof MissingBinaryError && (
        <MenuBarExtra.Item
          title="Pitchfork not found. Set its path…"
          icon={Icon.Gear}
          onAction={openExtensionPreferences}
        />
      )}
      {error && isSupervisorDown(error.message) && (
        <MenuBarExtra.Item
          title="Start Pitchfork Supervisor"
          icon={Icon.Play}
          onAction={async () => {
            await startSupervisor();
            revalidate();
          }}
        />
      )}
      {error && !(error instanceof MissingBinaryError) && !isSupervisorDown(error.message) && (
        <MenuBarExtra.Item title={`Could not read Pitchfork: ${error.message.slice(0, 80)}`} icon={Icon.Warning} />
      )}
      {namespaces.map((ns) => (
        <MenuBarExtra.Section key={ns} title={ns}>
          {daemons
            .filter((d) => namespaceOf(d) === ns)
            .map((daemon) => {
              const url = daemonUrl(daemon);
              return (
                <MenuBarExtra.Submenu
                  key={daemon.id}
                  icon={statusIcon(daemon)}
                  title={daemon.uptime ? `${nameOf(daemon)}  ·  ${daemon.uptime}` : nameOf(daemon)}
                >
                  {url && (
                    <MenuBarExtra.Item
                      title="Open in Browser"
                      subtitle={url}
                      icon={Icon.Globe}
                      onAction={() => open(url)}
                    />
                  )}
                  {daemonActions(daemon).map((action) => (
                    <MenuBarExtra.Item
                      key={action}
                      title={VERB[action]}
                      icon={ACTION_ICON[action]}
                      onAction={() => act(action, daemon)}
                    />
                  ))}
                  {daemon.error && <MenuBarExtra.Item title={daemon.error.slice(0, 80)} icon={Icon.Warning} />}
                </MenuBarExtra.Submenu>
              );
            })}
        </MenuBarExtra.Section>
      ))}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Search Daemons…"
          icon={Icon.MagnifyingGlass}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          onAction={async () => {
            try {
              await launchCommand({ name: "daemons", type: LaunchType.UserInitiated });
            } catch (error) {
              await showFailureToast(error, { title: "Could not open Search Daemons" });
            }
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
