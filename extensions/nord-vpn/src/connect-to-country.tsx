import { Action, ActionPanel, Icon, List, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  getNordLynxStatus,
  getNordVpnCountries,
  getNordVpnServerForCity,
  getPublicLocation,
  NordVpnCountry,
  NordVpnCity,
  runNordVPNCommand,
  waitForCountryConnection,
} from "./utils/nordvpn";

type ExtensionPreferences = {
  nordVpnExecutablePath: string;
};

type CountryList = {
  countries: NordVpnCountry[];
  isLoading: boolean;
  fallbackReason?: string;
  error?: string;
};

export default function ConnectToCountryCommand() {
  const [countryList, setCountryList] = useState<CountryList>({ countries: [], isLoading: true });
  const [connectingCode, setConnectingCode] = useState<string>();

  useEffect(() => {
    let cancelled = false;

    getNordVpnCountries()
      .then((result) => {
        if (!cancelled) {
          setCountryList({ ...result, isLoading: false });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setCountryList({
            countries: [],
            isLoading: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function connectToCountry(country: NordVpnCountry, city?: NordVpnCity) {
    if (connectingCode) return;

    const connectingKey = `${country.code}:${city?.id ?? "country"}`;
    const destination = city ? `${city.name}, ${country.name}` : country.name;
    setConnectingCode(connectingKey);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Connecting to ${destination}…`,
    });

    try {
      const { nordVpnExecutablePath } = getPreferenceValues<ExtensionPreferences>();
      const executablePath = nordVpnExecutablePath.trim();
      if (!executablePath) {
        throw new Error("Set the NordVPN executable path in the extension preferences.");
      }

      const [adapterStatus, currentLocation] = await Promise.all([getNordLynxStatus(), getPublicLocation()]);
      if (!city && adapterStatus === "Up" && currentLocation.countryCode.toUpperCase() === country.code.toUpperCase()) {
        toast.style = Toast.Style.Success;
        toast.title = `Already connected to ${country.name}`;
        toast.message = `${currentLocation.ip} — ${currentLocation.country}`;
        return;
      }

      const args = city
        ? ["--connect", "--server-name", await getNordVpnServerForCity(country, city)]
        : ["--connect", "--group-name", country.name];
      await runNordVPNCommand(executablePath, args);
      const connectedLocation = await waitForCountryConnection(country.code, adapterStatus, currentLocation);

      toast.style = Toast.Style.Success;
      toast.title = `Connected to ${destination}`;
      toast.message = `${connectedLocation.ip} — ${connectedLocation.country}`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Could not connect to ${destination}`;
      toast.message = error instanceof Error ? error.message : String(error);
    } finally {
      setConnectingCode(undefined);
    }
  }

  const subtitle = countryList.error
    ? `Unable to load countries: ${countryList.error}`
    : countryList.fallbackReason
      ? `Using built-in countries; API unavailable: ${countryList.fallbackReason}`
      : countryList.countries.length > 0
        ? `${countryList.countries.length} countries · ${countryList.countries.reduce((total, country) => total + country.cities.length, 0)} cities`
        : "Load NordVPN countries";

  return (
    <List isLoading={countryList.isLoading} searchBarPlaceholder="Search countries and cities">
      {countryList.error ? (
        <List.EmptyView title="Could not load countries" description={countryList.error} icon={Icon.Warning} />
      ) : (
        <List.Section title={subtitle}>
          {countryList.countries.map((country) => (
            <List.Item
              key={`${country.code}:country`}
              title={country.name}
              subtitle={connectingCode === `${country.code}:country` ? "Connecting…" : "Best server in country"}
              keywords={[country.code]}
              icon={Icon.Globe}
              actions={
                <ActionPanel>
                  <Action
                    title={`Connect to ${country.name}`}
                    icon={Icon.Network}
                    onAction={() => connectToCountry(country)}
                  />
                </ActionPanel>
              }
            />
          ))}
          {countryList.countries.flatMap((country) =>
            country.cities.map((city) => {
              const connectingKey = `${country.code}:${city.id ?? city.name}`;
              return (
                <List.Item
                  key={connectingKey}
                  title={city.name}
                  subtitle={`${country.name}${city.serverCount ? ` · ${city.serverCount} servers` : ""}${
                    connectingCode === connectingKey ? " · Connecting…" : ""
                  }`}
                  keywords={[country.name, country.code]}
                  icon={Icon.Building}
                  actions={
                    <ActionPanel>
                      <Action
                        title={`Connect to ${city.name}`}
                        icon={Icon.Network}
                        onAction={() => connectToCountry(country, city)}
                      />
                    </ActionPanel>
                  }
                />
              );
            }),
          )}
        </List.Section>
      )}
    </List>
  );
}
