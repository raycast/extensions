import { useBus, useFerry, useMetro, useShip, useTram } from "../fetchers/departures";
import { List, Icon, Color, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { TransportMode } from "../types/TransportMode";
import { Site as SiteType } from "../types/Site";
import moment from "moment";

const getMetroLine = (lineId: number) => {
  switch (lineId) {
    case 10:
    case 11:
      return {
        color: Color.Blue,
        name: "Blue Line",
      };
    case 13:
    case 14:
      return {
        color: Color.Red,
        name: "Red Line",
      };
    case 17:
    case 18:
    case 19:
      return {
        color: Color.Green,
        name: "Green Line",
      };
  }
};

const getIcon = (transportMode: TransportMode) => {
  switch (transportMode) {
    case TransportMode.Bus:
      return Icon.Car;
    case TransportMode.Metro:
    case TransportMode.Tram:
      return Icon.Train;
    case TransportMode.Ferry:
    case TransportMode.Ship:
      return Icon.Boat;
  }
};

const Site = ({ site }: { site: SiteType }) => {
  const { isLoading: metroIsLoading, data: metroData, revalidate: revalidateMetro } = useMetro(site);
  const { isLoading: ferryIsLoading, data: ferryData, revalidate: revalidateFerry } = useFerry(site);
  const { isLoading: shipIsLoading, data: shipData, revalidate: revalidateShip } = useShip(site);
  const { isLoading: tramIsLoading, data: tramData, revalidate: revalidateTram } = useTram(site);
  const { isLoading: busIsLoading, data: busData, revalidate: revalidateBus } = useBus(site);

  const isLoading = metroIsLoading || busIsLoading || ferryIsLoading || shipIsLoading || tramIsLoading;
  const combinedData = [
    ...(metroData?.departures ?? []),
    ...(ferryData?.departures ?? []),
    ...(shipData?.departures ?? []),
    ...(tramData?.departures ?? []),
    ...(busData?.departures ?? []),
  ].sort((a, b) => moment(a.expected).diff(moment(b.expected)));

  const revalidate = () => {
    try {
      revalidateMetro();
      revalidateFerry();
      revalidateShip();
      revalidateTram();
      revalidateBus();
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to fetch data",
      });
      console.error("Failed to revalidate", err);
    }
  };

  return (
    <List isLoading={isLoading} navigationTitle={`Departures for ${site.name}`}>
      {combinedData.map((item) => {
        const line = getMetroLine(item.line.id);
        return (
          <List.Item
            key={item.journey.id + item.scheduled}
            title={item.line.designation + " - " + item.destination}
            subtitle={item.display}
            accessories={[
              {
                tag: {
                  color: line?.color ?? Color.PrimaryText,
                  value: line?.name ?? "",
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action title="Reload" icon={Icon.ArrowClockwise} onAction={revalidate} />
              </ActionPanel>
            }
            icon={getIcon(item.line.transport_mode)}
          />
        );
      })}
    </List>
  );
};

export default Site;
