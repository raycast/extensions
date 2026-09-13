import {
  Action,
  ActionPanel,
  Color,
  closeMainWindow,
  Icon,
  Keyboard,
  List,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { runWithToast } from "./feedback";
import {
  connectToCountry,
  getRichStatus,
  openProtonApp,
  reconnectLastServer,
  smartDisconnect,
} from "./protonapp";
import { addRecentCountry, getRecentCountries } from "./recents";
import { CountryInfo, countryName, flagEmoji, listCountries } from "./servers";
import { ProtonVpnNotFoundError } from "./vpn";

async function connectAction(country?: CountryInfo) {
  const label = country ? `${country.flag} ${country.name}` : "fastest server";
  await closeMainWindow();
  await runWithToast(`Connecting to ${label}…`, async () => {
    const result = await connectToCountry(country?.code);
    if (country) await addRecentCountry(country.code);
    const server = result.server;
    return {
      title: `Connected to ${label}`,
      message: server?.name
        ? `${server.name}${server.city ? ", " + server.city : ""}`
        : undefined,
    };
  });
}

async function disconnectAction() {
  await closeMainWindow();
  await runWithToast("Disconnecting…", async () => {
    await smartDisconnect();
    return { title: "Proton VPN disconnected" };
  });
}

async function reconnectAction() {
  await closeMainWindow();
  await runWithToast("Reconnecting…", async () => {
    await reconnectLastServer();
    return { title: "Proton VPN connected" };
  });
}

function GlobalActions({ connected }: { connected: boolean }) {
  return (
    <ActionPanel.Section>
      {connected && (
        <Action
          title="Disconnect"
          icon={Icon.LockUnlocked}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={disconnectAction}
        />
      )}
      <Action
        title="Connect to Fastest Server"
        icon={Icon.Bolt}
        shortcut={{ modifiers: ["cmd"], key: "f" }}
        onAction={() => connectAction(undefined)}
      />
      <Action
        title="Open Proton VPN App"
        icon={Icon.AppWindow}
        shortcut={Keyboard.Shortcut.Common.Open}
        onAction={openProtonApp}
      />
    </ActionPanel.Section>
  );
}

function CountryItem({
  country,
  isConnectedTo,
  anyConnected,
}: {
  country: CountryInfo;
  isConnectedTo: boolean;
  anyConnected: boolean;
}) {
  return (
    <List.Item
      icon={country.flag}
      title={country.name}
      keywords={[country.code]}
      accessories={[
        ...(isConnectedTo
          ? [
              {
                icon: { source: Icon.CheckCircle, tintColor: Color.Green },
                tag: { value: "Connected", color: Color.Green },
              },
            ]
          : []),
        ...(country.distanceKm !== undefined
          ? [{ text: `${country.distanceKm.toLocaleString()} km` }]
          : []),
        { tag: `${country.avgLoad}%` },
        { text: `${country.serverCount}` },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {isConnectedTo ? (
              <>
                <Action
                  title="Disconnect"
                  icon={Icon.LockUnlocked}
                  onAction={disconnectAction}
                />
                <Action
                  title={`Reconnect Fastest in ${country.name}`}
                  icon={Icon.ArrowClockwise}
                  onAction={() => connectAction(country)}
                />
              </>
            ) : (
              <Action
                title={
                  anyConnected
                    ? `Switch to ${country.name}`
                    : `Connect to ${country.name}`
                }
                icon={Icon.Globe}
                onAction={() => connectAction(country)}
              />
            )}
          </ActionPanel.Section>
          <GlobalActions connected={anyConnected} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const status = usePromise(getRichStatus);
  const countries = usePromise(listCountries);
  const recents = usePromise(getRecentCountries);

  if (status.error) {
    const isMissing = status.error instanceof ProtonVpnNotFoundError;
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title={
            isMissing
              ? "Proton VPN profile not found"
              : "Could not read the VPN status"
          }
          description={
            isMissing
              ? "Open the Proton VPN app, sign in, and connect once. Then try again."
              : String(status.error)
          }
          actions={
            <ActionPanel>
              <Action
                title="Open Proton VPN App"
                icon={Icon.AppWindow}
                onAction={openProtonApp}
              />
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={status.revalidate}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const state = status.data?.state;
  const connected = state === "Connected";
  const server = status.data?.server;
  const connectedCode = connected ? server?.exitCountryCode : undefined;

  const all = countries.data ?? [];
  const byCode = new Map(all.map((c) => [c.code, c]));
  const recentList = (recents.data ?? [])
    .map((code) => byCode.get(code))
    .filter((c): c is CountryInfo => c !== undefined);

  const statusTitle = connected
    ? `Connected to ${connectedCode ? countryName(connectedCode) : "Unknown"}${server?.name ? ` (${server.name}${server.city ? ", " + server.city : ""})` : ""}`
    : state === "Connecting" || state === "Disconnecting"
      ? state
      : "Disconnected";

  return (
    <List
      isLoading={status.isLoading || countries.isLoading}
      searchBarPlaceholder="Search countries…"
    >
      <List.Section title="Status">
        <List.Item
          icon={
            connected
              ? { source: Icon.Lock, tintColor: Color.Green }
              : { source: Icon.LockUnlocked, tintColor: Color.SecondaryText }
          }
          title={statusTitle}
          accessories={
            connectedCode ? [{ text: flagEmoji(connectedCode) }] : []
          }
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                {connected ? (
                  <Action
                    title="Disconnect"
                    icon={Icon.LockUnlocked}
                    onAction={disconnectAction}
                  />
                ) : (
                  <Action
                    title="Reconnect Last Server"
                    icon={Icon.Lock}
                    onAction={reconnectAction}
                  />
                )}
              </ActionPanel.Section>
              <GlobalActions connected={connected} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Bolt}
          title="Fastest Server"
          subtitle="Let Proton VPN pick"
          actions={
            <ActionPanel>
              <Action
                title="Connect to Fastest Server"
                icon={Icon.Bolt}
                onAction={() => connectAction(undefined)}
              />
              <GlobalActions connected={connected} />
            </ActionPanel>
          }
        />
      </List.Section>
      {recentList.length > 0 && (
        <List.Section title="Recent">
          {recentList.map((c) => (
            <CountryItem
              key={`recent-${c.code}`}
              country={c}
              isConnectedTo={c.code === connectedCode}
              anyConnected={connected}
            />
          ))}
        </List.Section>
      )}
      <List.Section
        title="All Countries"
        subtitle={`${all.length}, nearest first`}
      >
        {all.map((c) => (
          <CountryItem
            key={c.code}
            country={c}
            isConnectedTo={c.code === connectedCode}
            anyConnected={connected}
          />
        ))}
      </List.Section>
    </List>
  );
}
