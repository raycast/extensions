import { Arrival } from "../models";
import { getModeEmoji } from "./modes";
import { abbreviateName } from "./abbriviations";

export const formatArrival = (arrival: Arrival): string => {
  const expectedArrival = new Date(arrival.expectedArrival);
  const hours = expectedArrival.getHours().toString().padStart(2, '0');
  const minutes = expectedArrival.getMinutes().toString().padStart(2, '0');
  const abbreviatedStationName = abbreviateName(arrival.stationName);
  const directionEmoji = arrival.direction === "outbound" ? "OUT" : "IN";
  const modeEmoji = getModeEmoji(arrival.modeName);
  return `${hours}:${minutes} ${directionEmoji} ${modeEmoji} - ${abbreviatedStationName}`;
};