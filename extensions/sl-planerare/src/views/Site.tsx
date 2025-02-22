import { List, Icon, Color } from "@raycast/api";
import moment from "moment";
import { TransportMode } from "../types/TransportMode";
import { Site as SiteType } from "../types/Site";
import { useBus, useFerry, useMetro, useShip, useTram } from "../fetchers/depatures";

const getMetroLine = (lineId: number) => {
  switch (lineId) {
    case 10:
    case 11:
      return {
        color: Color.Blue,
        name: "Blå linjen",
      };
    case 13:
    case 14:
      return {
        color: Color.Red,
        name: "Röda linjen",
      };
    case 17:
    case 18:
    case 19:
      return {
        color: Color.Green,
        name: "Gröna linjen",
      };
  }
};

const getIcon = (transportMode: TransportMode) => {
  switch (transportMode) {
    case TransportMode.Bus:
      return Icon.Dna;
    case TransportMode.Metro:
      return Icon.Train;
  }
};

const Site = ({ site }: { site: SiteType }) => {
  const { isLoading: metroIsLoading, data: metroData } = useMetro(site);
  const { isLoading: busIsLoading, data: busData } = useBus(site);
  const { isLoading: ferryIsLoading, data: ferryData } = useFerry(site);
  const { isLoading: shipIsLoading, data: shipData } = useShip(site);
  const { isLoading: tramIsLoading, data: tramData } = useTram(site);

  const isLoading = metroIsLoading || busIsLoading || ferryIsLoading || shipIsLoading || tramIsLoading;
  const compindedData = [
    ...(metroData?.departures ?? []),
    ...(busData?.departures ?? []),
    ...(ferryData?.departures ?? []),
    ...(shipData?.departures ?? []),
    ...(tramData?.departures ?? []),
  ].sort((a, b) => moment(a.expected).diff(moment(b.expected)));

  return (
    <List isLoading={isLoading}>
      {compindedData.map((item) => {
        const line = getMetroLine(item.line.id);
        return (
          <List.Item
            key={item.journey.id}
            title={item.destination}
            accessories={[
              {
                text: {
                  color: line?.color,
                  value: line?.name,
                },
              },
            ]}
            subtitle={item.display}
            icon={getIcon(item.line.transport_mode)}
          />
        );
      })}
    </List>
  );
};

export default Site;
