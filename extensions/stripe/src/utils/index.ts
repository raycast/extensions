import { startCase, camelCase } from "lodash";

export const convertAmount = (amount: number) => amount / 100;

export const titleCase = (str: string) => startCase(camelCase(str));

const dateFormatOptions = {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  timeZoneName: "short",
  hour12: false,
};

export const convertTimestampToDate = (timestamp: number | null): string => {
  if (!timestamp) {
    return "";
  }

  const dateFormat = new Intl.DateTimeFormat("en-GB", dateFormatOptions as any);

  const milliseconds = timestamp * 1000;
  const dateObj = new Date(milliseconds);
  return dateFormat.format(dateObj);
};

export const resolveMetadataValue = (value: any) => {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "boolean") {
    return `${value}`;
  }

  if (typeof value === "number") {
    return `${value}`;
  }

  return "";
};
