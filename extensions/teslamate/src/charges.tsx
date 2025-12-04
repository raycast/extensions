import { List, Icon, Color, Detail, Action, ActionPanel } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { baseApiConfig, baseApiBody } from "./utils/dbQueries";
import { chargingQueryObject } from "./utils/chargesDbStatements";
import { formatDuration } from "./utils/timeFormatter";
import { coordinatesConverter } from "./utils/coordinatesConverter";
import { handleChargeSessionObject } from "./utils/chargeSessionObject";
import { baseGrafanaUrl } from "./utils/constants";
import { ChargingSession } from "./types/ChargingSession";

export default function Charges() {
  // Retrive charging sessions data
  const {
    isLoading: chargingDataIsLoading,
    data: chargingResponseData,
    error: responseError,
    revalidate,
  } = useFetch(baseApiConfig.url, {
    method: baseApiConfig.method,
    headers: baseApiConfig.headers,
    body: JSON.stringify(baseApiBody(chargingQueryObject)),
    keepPreviousData: true,
  });

  if (!chargingResponseData) return <Detail markdown={"Failed to fetch data from TeslaMate" + responseError} />;

  // Extract data from response
  const chargingSessionsObject = handleChargeSessionObject(chargingResponseData);

  return (
    <List isShowingDetail isLoading={chargingDataIsLoading}>
      {/* List of charging sessions */}

      {chargingSessionsObject.length === 0 ? (
        <List.EmptyView icon={{ source: "../assets/svg/test.svg" }} title="No charging sessions found" />
      ) : (
        chargingSessionsObject.map((chargingSession: ChargingSession, index: number) => (
          <List.Item
            key={index}
            title={chargingSession.startDate}
            subtitle={chargingSession.startBatteryLevel + "%" + " ⇒ " + chargingSession.endBatteryLevel + "%"}
            detail={
              <List.Item.Detail
                markdown={
                  "![](" +
                  coordinatesConverter(Number(chargingSession.longitude), Number(chargingSession.latitude)) +
                  ")"
                }
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Charging session date" text={chargingSession.startDate} />
                    <List.Item.Detail.Metadata.Label
                      title="Duration"
                      text={formatDuration(Number(chargingSession.durationMin))}
                      icon={{ source: Icon.Clock, tintColor: Color.Blue }}
                    />
                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label
                      title="🔋 Battery level"
                      text={chargingSession.startBatteryLevel + "%" + " ⇒ " + chargingSession.endBatteryLevel + "%"}
                      icon={{ source: Icon.Battery, tintColor: Color.Green }}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="🔌 kWh added"
                      text={chargingSession.chargeEnergyAdded + " kWh"}
                      icon={{ source: Icon.Battery, tintColor: Color.Green }}
                    />

                    <List.Item.Detail.Metadata.Label
                      title="🛣️ Range added"
                      text={chargingSession.addedRangeKm + " " + chargingSession.lengthUnit}
                      icon={{ source: Icon.Battery, tintColor: Color.Green }}
                    />
                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label
                      title="🌡️ Outside temp"
                      text={chargingSession.outsideTempAvg + " °" + chargingSession.temperatureUnit}
                      icon={{ source: Icon.Temperature, tintColor: Color.Orange }}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel title="Open Grafana Dashboard">
                <Action.OpenInBrowser
                  title="Open Grafana Dashboard"
                  url={baseGrafanaUrl}
                  icon="../assets/grafana-logo.png"
                />
                <Action title="Update / Reload" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
