import axios from "axios";
import { API_URL } from "./constants";
import { Color, Icon, List } from "@raycast/api";
import { IDeparture } from "../types";

export async function getDepartures(siteId: string) {
  if (!siteId || typeof siteId !== "string") {
    return {
      Metros: [],
      Buses: [],
      Trains: [],
      Trams: [],
      Ships: [],
    };
  }

  return axios
    .get<{
      Metros: IDeparture[];
      Buses: IDeparture[];
      Trains: IDeparture[];
      Trams: IDeparture[];
      Ships: IDeparture[];
    }>(API_URL + `/departures?siteId=${siteId}`)
    .then((res) => res.data);
}

export function getDepartureAccessories(departure: IDeparture): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [
    ...(departure.GroupOfLine
      ? departure.TransportMode === "METRO" && departure.Color
        ? [
            {
              text: {
                value: departure.GroupOfLine,
                color: Color[departure.Color],
              },
              icon: {
                source: Icon.Minus,
                tintColor: Color[departure.Color],
              },
            },
          ]
        : [
            {
              text: departure.GroupOfLine,
            },
          ]
      : []),
    ...(departure.StopPointDesignation
      ? ["SHIP", "BUS"].includes(departure.TransportMode)
        ? [
            {
              icon: Icon.Stop,
              tooltip: `Stop ${departure.StopPointDesignation}`,
              text: departure.StopPointDesignation,
            },
          ]
        : [
            {
              icon: Icon.Snippets,
              tooltip: `Track ${departure.StopPointDesignation}`,
              text: departure.StopPointDesignation,
            },
          ]
      : []),
    {
      tag: {
        value: departure.DisplayTime,
        color: departure.DisplayTime === "Now" ? Color.Green : Color.PrimaryText,
      },
    },
  ];

  return accessories;
}
