import axios from "axios";
import { API_URL } from "./constants";
import { Color, Icon, List } from "@raycast/api";
import { IDeparture } from "../types";

export async function getDepartures(id: string) {
  if (!id || typeof id !== "string") {
    return [];
  }

  return axios.get<IDeparture[]>(API_URL + `/stops/${id}/departures`).then((res) => res.data);
}

export function getDepartureAccessories(departure: IDeparture): List.Item.Accessory[] {
  function getTimeToDeparture(dateString: Date): string {
    const currentDate: Date = new Date();
    const date: Date = new Date(dateString);
    const diffInMs: number = date.getTime() - currentDate.getTime();
    const diffInMinutes: number = Math.round(diffInMs / (1000 * 60));

    if (diffInMinutes < 1) {
      return "Now";
    }
    return `${diffInMinutes} min`;
  }

  const accessories: List.Item.Accessory[] = [];

  departure.remarks?.forEach((remark) => {
    if (remark.code === "bf") {
      accessories.push({
        text: {
          value: "Barrier-free",
          color: Color.Magenta,
        },
        icon: {
          source: Icon.Heart,
          tintColor: Color.Magenta,
        },
      });
    }
    if (remark.code === "FK") {
      accessories.push({
        text: {
          value: "Bikes allowed",
          color: Color.Blue,
        },
        icon: {
          source: Icon.Bike,
          tintColor: Color.Blue,
        },
      });
    }
  });

  if (["ferry", "bus"].includes(departure.line.mode)) {
    accessories.push({
      icon: Icon.Stop,
      tooltip: `Last stop ${departure.destination.name}`,
      text: departure.destination.name,
    });
  } else {
    accessories.push({
      icon: Icon.Snippets,
      tooltip: `Track ${departure.platform}`,
      text: departure.platform,
    });
  }

  accessories.push({
    tag: {
      value: getTimeToDeparture(departure.when),
      color: getTimeToDeparture(departure.when) === "Now" ? Color.Green : Color.PrimaryText,
    },
  });

  return accessories;
}
