import { Color, Icon, List } from "@raycast/api";
import { useTripSearch } from "../api/client";
import { ArrivalOrDeparture, Trip } from "../api/types";
import Accessory = List.Item.Accessory;

export interface TripsProps {
  fromStation: string;
  toStation: string;
  date: string;
  searchArrival: boolean;
}

const formatter = Intl.DateTimeFormat("en-NL", {
  timeStyle: "short",
  timeZone: "Europe/Amsterdam",
});

export function Trips(props: TripsProps) {
  const { isLoading, data } = useTripSearch(props.fromStation, props.toStation, props.date, props.searchArrival);

  return (
    <List isLoading={isLoading} navigationTitle="Search Trips">
      {((data === undefined ? { payload: [] } : data).trips || []).map(renderTripRow)}
    </List>
  );
}

function getTripTime(trip: Trip): [string, string] {
  if (trip.legs.length === 1) {
    const start = new Date(Date.parse((trip.legs[0].origin.actualDateTime ?? trip.legs[0].origin.plannedDateTime)!));
    const end = new Date(
      Date.parse((trip.legs[0].destination.actualDateTime ?? trip.legs[0].destination.plannedDateTime)!),
    );
    return [formatter.format(start), formatter.format(end)];
  }

  const start = new Date(Date.parse((trip.legs[0].origin.actualDateTime ?? trip.legs[0].origin.plannedDateTime)!));
  const end = new Date(
    Date.parse(
      (trip.legs[trip.legs.length - 1].destination.actualDateTime ??
        trip.legs[trip.legs.length - 1].destination.plannedDateTime)!,
    ),
  );
  return [formatter.format(start), formatter.format(end)];
}

function renderTripRow(trip: Trip) {
  const fromStationName: string | undefined = trip.legs[0].origin.name;
  const toStationName: string | undefined =
    trip.legs.length === 1 ? trip.legs[0].destination.name : trip.legs[trip.legs.length - 1].destination.name;
  const tripTime = getTripTime(trip);
  const transfers: number | undefined = trip.legs.length > 1 ? trip.legs.length - 1 : undefined;
  const products: string[] = [];
  const accessories: Accessory[] = [];

  trip.legs.forEach((l) => {
    if (l.product !== undefined) {
      products.push(l.product.shortCategoryName!);
    }
  });

  if (transfers !== undefined) {
    accessories.push({
      text: { value: `${transfers} transfers` },
      icon: Icon.Train,
    });
  }

  accessories.push({
    text: { value: products.join(" - ") },
  });

  if (trip.crowdForecast !== undefined) {
    switch (trip.crowdForecast) {
      case ArrivalOrDeparture.CrowdForecastEnum.UNKNOWN:
      case ArrivalOrDeparture.CrowdForecastEnum.LOW:
        accessories.push({
          text: { value: "Low", color: Color.Green },
          icon: Icon.TwoPeople,
        });
        break;
      case ArrivalOrDeparture.CrowdForecastEnum.MEDIUM:
        accessories.push({
          text: { value: "Medium", color: Color.Orange },
          icon: Icon.TwoPeople,
        });
        break;
      case ArrivalOrDeparture.CrowdForecastEnum.HIGH:
        accessories.push({
          text: { value: "High", color: Color.Red },
          icon: Icon.TwoPeople,
        });
        break;
    }
  }

  accessories.push({
    text: {
      value: `${tripTime[0]} - ${tripTime[1]}`,
      color: Color.PrimaryText,
    },
  });

  if (trip.plannedDurationInMinutes !== undefined) {
    accessories.push({
      text: { value: `${trip.plannedDurationInMinutes} min` },
      icon: Icon.Clock,
    });

    if (trip.actualDurationInMinutes !== undefined && trip.actualDurationInMinutes > trip.plannedDurationInMinutes) {
      accessories.push({
        tag: { value: `+${trip.actualDurationInMinutes - trip.plannedDurationInMinutes} min`, color: Color.Red },
      });
    }
  }

  return <List.Item key={trip.uid} title={`${fromStationName} - ${toStationName}`} accessories={accessories} />;
}
