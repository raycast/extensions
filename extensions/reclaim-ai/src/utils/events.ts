import { ApiResponseEvents } from "../hooks/useEvent.types";

export const eventColors = {
  NONE: "#AAA",
  LAVENDER: "#6E7BC4",
  SAGE: "#2DAD6E",
  GRAPE: "#8321A0",
  FLAMINGO: "#E27068",
  BANANA: "#F5B623",
  TANGERINE: "#F2471C",
  PEACOCK: "#0191E1",
  GRAPHITE: "#565656",
  BLUEBERRY: "#3748AC",
  BASIL: "#0E753B",
  TOMATO: "#CF0003",
} as const;

export const truncateEventSize = (eventTitle: string) => {
  const TRUNCATE_LENGTH = 18;

  if (eventTitle.length > TRUNCATE_LENGTH) {
    return `${eventTitle.substring(0, TRUNCATE_LENGTH)}...`;
  }
  return eventTitle;
};
