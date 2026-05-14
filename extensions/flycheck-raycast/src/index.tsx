import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  environment,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useFetch, useLocalStorage } from "@raycast/utils";
import { useState, useEffect } from "react";
import { isValidIcaoCode } from "./utils";

const FLYCHECK_MACOS_URL = "https://fractals.sg/flycheck/";

interface DecodedMetar {
  icao: string;
  station?: { name: string };
  observed: string;
  raw_text: string;
  flight_category?: string;
  barometer?: { hg: number; hpa: number };
  temperature?: { celsius: number; fahrenheit: number };
  dewpoint?: { celsius: number; fahrenheit: number };
  wind?: { degrees: number; speed_kts: number; gust_kts?: number };
  visibility?: { miles: string; meters: string };
}

interface CheckWXResponse {
  data: DecodedMetar[];
  results: number;
}

const getFlightCategoryColor = (category?: string) => {
  switch (category) {
    case "VFR":
      return Color.Green;
    case "MVFR":
      return Color.Blue;
    case "IFR":
      return Color.Red;
    case "LIFR":
      return Color.Magenta;
    default:
      return Color.SecondaryText;
  }
};

const DownloadFlyCheckAction = () => (
  <Action.OpenInBrowser
    title="Download FlyCheck for macOS"
    url={FLYCHECK_MACOS_URL}
    icon={Icon.Download}
    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
  />
);

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { apiKey, tempUnit } = getPreferenceValues<Preferences>();
  const { value: history, setValue: setHistory } = useLocalStorage<DecodedMetar[]>("metar-history", []);

  const { isLoading, data, error, revalidate } = useFetch<CheckWXResponse>(
    `https://api.checkwx.com/metar/${searchText}/decoded`,
    {
      headers: { "X-API-Key": apiKey },
      // Only fetch if we have a valid ICAO code (4 chars)
      execute: isValidIcaoCode(searchText),
      keepPreviousData: true,
      onData: (newData) => {
        if (newData.results > 0 && newData.data.length > 0) {
          const metar = newData.data[0];
          const prevHistory = history || [];
          const filtered = prevHistory.filter((item) => item.icao !== metar.icao);
          setHistory([metar, ...filtered].slice(0, 10));
        }
      },
    },
  );

  useEffect(() => {
    if (error && !error.message.includes("401")) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch METAR",
        message: error.message,
      });
    }
  }, [error]);

  const is401 = error && error.message.includes("401");
  const showDetail = isValidIcaoCode(searchText) && !is401;

  // `environment.platform` isn't present on the declared `Environment` type
  // so narrow it here for runtime checks.
  const platform = (environment as unknown as { platform?: string }).platform;
  const isMac = platform === "macOS";

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter ICAO code (e.g. KJFK)"
      throttle
      isShowingDetail={showDetail}
    >
      {is401 ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Invalid API Key"
          description="The CheckWX API key provided is invalid. Please update it in preferences."
          actions={
            <ActionPanel>
              <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : searchText.length === 0 ? (
        <List.Section title="Recent Searches">
          {history?.map((metar) => (
            <List.Item
              key={metar.icao}
              icon={Icon.Clock}
              title={metar.icao}
              subtitle={metar.station?.name}
              accessories={[
                {
                  tag: {
                    value: metar.flight_category || "N/A",
                    color: getFlightCategoryColor(metar.flight_category),
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action title="Search" icon={Icon.MagnifyingGlass} onAction={() => setSearchText(metar.icao)} />
                  <Action
                    title="Remove from History"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => {
                      const newHistory = (history || []).filter((item) => item.icao !== metar.icao);
                      setHistory(newHistory);
                    }}
                  />
                  {isMac && (
                    <ActionPanel.Section>
                      <DownloadFlyCheckAction />
                    </ActionPanel.Section>
                  )}
                  <ActionPanel.Section>
                    <Action
                      title="Clear All History"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.RemoveAll}
                      onAction={async () => {
                        if (
                          await confirmAlert({
                            title: "Clear All History?",
                            message: "This action cannot be undone.",
                            primaryAction: {
                              title: "Clear History",
                              style: Alert.ActionStyle.Destructive,
                            },
                          })
                        ) {
                          setHistory([]);
                          showToast({ style: Toast.Style.Success, title: "Cleared History" });
                        }
                      }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        showDetail &&
        data?.data.map((metar) => (
          <List.Item
            key={metar.icao}
            icon={Icon.Cloud}
            title={metar.icao}
            subtitle={metar.station?.name}
            accessories={[
              {
                tag: {
                  value: metar.flight_category || "N/A",
                  color: getFlightCategoryColor(metar.flight_category),
                },
              },
            ]}
            detail={
              <List.Item.Detail
                markdown={`# ${metar.station?.name || "Unknown"}\n\n**Raw Text**\n\`\`\`\n${metar.raw_text}\n\`\`\``}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="ICAO" text={metar.icao} />
                    <List.Item.Detail.Metadata.Label title="Station" text={metar.station?.name || "Unknown"} />
                    <List.Item.Detail.Metadata.Label title="Observed" text={metar.observed} />
                    <List.Item.Detail.Metadata.TagList title="Flight Category">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={metar.flight_category || "N/A"}
                        color={getFlightCategoryColor(metar.flight_category)}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Wind"
                      text={`${metar.wind?.degrees ?? "VRB"}° at ${metar.wind?.speed_kts || 0} kts${
                        metar.wind?.gust_kts ? ` (Gusts ${metar.wind.gust_kts} kts)` : ""
                      }`}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Visibility"
                      text={`${metar.visibility?.miles || 0} miles`}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Temperature"
                      text={
                        metar.temperature
                          ? `${metar.temperature[tempUnit]}°${tempUnit === "celsius" ? "C" : "F"}`
                          : "N/A"
                      }
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Dewpoint"
                      text={
                        metar.dewpoint ? `${metar.dewpoint[tempUnit]}°${tempUnit === "celsius" ? "C" : "F"}` : "N/A"
                      }
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Barometer"
                      text={`${metar.barometer?.hg || 0} inHg (${metar.barometer?.hpa || 0} hPa)`}
                    />
                    {isMac && (
                      <>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Link
                          title="Download App"
                          text="FlyCheck for macOS Menu Bar"
                          target={FLYCHECK_MACOS_URL}
                        />
                      </>
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={metar.raw_text} title="Copy Raw METAR" />
                <Action.CopyToClipboard content={JSON.stringify(metar, null, 2)} title="Copy Decoded JSON" />
                <ActionPanel.Section>
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={revalidate}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                  />
                </ActionPanel.Section>
                {isMac && (
                  <ActionPanel.Section>
                    <DownloadFlyCheckAction />
                  </ActionPanel.Section>
                )}
              </ActionPanel>
            }
          />
        ))
      )}
      {!is401 && (
        <List.EmptyView
          title={!showDetail ? "Enter ICAO Code" : "No METAR Found"}
          description={!showDetail ? "Type a valid 4-letter ICAO code." : `Could not find METAR for "${searchText}"`}
        />
      )}
    </List>
  );
}
