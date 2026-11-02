import {
  getApplications,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  openExtensionPreferences,
  showInFinder,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { quitApp } from "./lib/app-actions";
import { formatRate } from "./lib/format";
import { sampleNetwork } from "./lib/monitor";
import { canQuitApp } from "./lib/processes";
import { combinedRate, sortApps, visibleApps } from "./lib/usage";
import { preferences } from "./preferences";

export default function TopNetworkApp() {
  const prefs = preferences();
  const { data, error, isLoading, revalidate } = usePromise(async () => sampleNetwork(getApplications()));
  const apps = data && !error ? sortApps(visibleApps(data, prefs.hideSystemDaemons)).slice(0, 5) : [];
  const top = apps[0];
  const busy = top && combinedRate(top) > prefs.thresholdBytes;
  const title = busy
    ? `${top.name} ${formatRate(combinedRate(top), prefs.units)}${prefs.showUpload ? ` ↑ ${formatRate(top.uploadBps, prefs.units)}` : ""}`
    : undefined;
  return (
    <MenuBarExtra
      icon={error ? Icon.ExclamationMark : Icon.Network}
      title={title}
      isLoading={isLoading}
      tooltip={
        error
          ? "Network Hogs could not refresh"
          : top
            ? `${top.name} · ↓ ${formatRate(top.downloadBps, prefs.units)} · ↑ ${formatRate(top.uploadBps, prefs.units)}`
            : "Network Hogs"
      }
    >
      <MenuBarExtra.Section
        title={
          error
            ? "Could not refresh network usage"
            : data
              ? `Sampled at ${new Date(data.timestamp).toLocaleTimeString()}`
              : "Measuring network activity…"
        }
      >
        {error && <MenuBarExtra.Item title={error.message} />}
        {apps.map((app) => (
          <MenuBarExtra.Submenu
            key={app.id}
            title={`${app.name}  ↓ ${formatRate(app.downloadBps, prefs.units)}  ↑ ${formatRate(app.uploadBps, prefs.units)}`}
            icon={app.identity.kind === "app" ? { fileIcon: app.identity.path } : Icon.Terminal}
          >
            {canQuitApp(app) && (
              <MenuBarExtra.Item
                title={`Quit ${app.name}`}
                icon={Icon.XMarkCircle}
                onAction={async () => {
                  await quitApp(app);
                  await revalidate();
                }}
              />
            )}
            <MenuBarExtra.Item
              title="Open Network Hogs"
              icon={Icon.List}
              onAction={() => launchCommand({ name: "network-hogs", type: LaunchType.UserInitiated })}
            />
            {app.identity.kind === "app" && (
              <MenuBarExtra.Item
                title="Reveal in Finder"
                icon={Icon.Finder}
                onAction={() => {
                  if (app.identity.kind === "app") return showInFinder(app.identity.path);
                }}
              />
            )}
          </MenuBarExtra.Submenu>
        ))}
        {data && !error && !apps.length && <MenuBarExtra.Item title="No visible network apps" />}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Network Hogs"
          icon={Icon.List}
          onAction={() => launchCommand({ name: "network-hogs", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
        <MenuBarExtra.Item title="Preferences…" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
