import moment from "moment";
import { Distance } from "../types/Distance";

export const getTimeDiffString = (start: number, end: number): string => {
  const duration = moment.duration(end - start, "seconds");
  const hours = Math.floor(duration.asHours());
  const minutes = duration.minutes();
  return `${hours}h ${minutes}m`;
};

export const getFormattedTime = (unixTimestamp: number): string => {
  return moment.unix(unixTimestamp).format("MMM D h:mm A");
};

export const getElapsedTime = (start: number, end: number): string => {
  if (start >= end) {
    return "Invalid timestamps";
  }

  const startTime = getFormattedTime(start);
  const endTime = getFormattedTime(end);

  // Extract only time portion for end time
  const endTimePortion = endTime.split(" ")[2] + " " + endTime.split(" ")[3];

  const duration = getTimeDiffString(start, end);

  return `${startTime} - ${endTimePortion} - ${duration}`;
};

export const getDistance = (miles: number, preference: Distance): number => {
  if (preference === "miles") return miles;
  const kilometers = miles * 1.60934;
  return kilometers;
};
