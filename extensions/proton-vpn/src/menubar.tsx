import {
  Color,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getRichStatus, openProtonApp, reconcileTransition } from "./protonapp";
import { countryName, flagEmoji, listCountries } from "./servers";

async function getMenuData() {
  const [status, countries] = await Promise.all([
    getRichStatus(),
    listCountries().catch(() => []),
  ]);
  const transition = await reconcileTransition(status);
  return { status, nearest: countries.slice(0, 8), transition };
}

function runCommand(name: string, args?: Record<string, string>) {
  return launchCommand({
    name,
    type: LaunchType.UserInitiated,
    arguments: args,
  }).catch(() => undefined);
}

export default function Command() {
  const { data, isLoading } = usePromise(getMenuData);

  const state = data?.status.state;
  const connected = state === "Connected";
  const server = data?.status.server;
  const country = connected ? server?.exitCountryCode : undefined;
  const transition = data?.transition;

  // Menu bar icons must stay monochrome: untinted icons render as template
  // images that adapt to the menu bar theme. The flag carries the color.
  const icon = transition
    ? Icon.CircleProgress
    : connected
      ? Icon.Lock
      : { source: Icon.LockUnlocked, tintColor: Color.SecondaryText };

  const title = transition
    ? transition.countryCode
      ? flagEmoji(transition.countryCode)
      : undefined
    : country
      ? flagEmoji(country)
      : undefined;

  const transitionText = transition
    ? transition.kind === "disconnect"
      ? "Disconnecting…"
      : transition.countryCode
        ? `Switching to ${countryName(transition.countryCode)}…`
        : "Connecting…"
    : undefined;

  return (
    <MenuBarExtra
      icon={icon}
      title={title}
      tooltip={transitionText ?? `Proton VPN: ${state ?? "Unknown"}`}
      isLoading={isLoading || transition !== undefined}
    >
      <MenuBarExtra.Item
        title={
          transitionText ??
          (connected && country
            ? `Connected to ${countryName(country)}${server?.name ? " (" + server.name + ")" : ""}`
            : `Status: ${state ?? "Unknown"}`)
        }
      />
      <MenuBarExtra.Separator />
      {!transition &&
        (connected ? (
          <MenuBarExtra.Item
            title="Disconnect"
            icon={Icon.LockUnlocked}
            onAction={() => runCommand("toggle")}
          />
        ) : (
          <MenuBarExtra.Item
            title="Connect (Last Server)"
            icon={Icon.Lock}
            onAction={() => runCommand("toggle")}
          />
        ))}
      <MenuBarExtra.Item
        title="Switch Country…"
        icon={Icon.Globe}
        onAction={() => runCommand("index")}
      />
      {!transition && (data?.nearest.length ?? 0) > 0 && (
        <MenuBarExtra.Submenu title="Nearest Countries" icon={Icon.Pin}>
          {data?.nearest.map((c) => (
            <MenuBarExtra.Item
              key={c.code}
              title={`${c.flag} ${c.name}`}
              icon={
                c.code === country
                  ? { source: Icon.CheckCircle, tintColor: Color.Green }
                  : undefined
              }
              subtitle={
                c.distanceKm !== undefined
                  ? `${c.distanceKm.toLocaleString()} km`
                  : undefined
              }
              onAction={() => runCommand("quick-switch", { country: c.code })}
            />
          ))}
        </MenuBarExtra.Submenu>
      )}
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title="Open Proton VPN App"
        icon={Icon.AppWindow}
        onAction={openProtonApp}
      />
    </MenuBarExtra>
  );
}
