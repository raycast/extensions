import { format, parse } from "date-fns";

export const getFlagEmoji = (isoCode?: string) => {
  if (!isoCode) return "🏴";

  if (isoCode === "GB-ENG") {
    return "🏴󠁧󠁢󠁥󠁮󠁧󠁿";
  }
  if (isoCode === "GB-WLS") {
    return "🏴󠁧󠁢󠁷󠁬󠁳󠁿";
  }
  if (isoCode === "GB-SCT") {
    return "🏴󠁧󠁢󠁳󠁣󠁴󠁿";
  }
  if (isoCode === "GB-NIR") {
    // The only official flag in Northern Ireland is the Union Flag of the United Kingdom.
    return "🇬🇧";
  }

  return isoCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
};

export const convertToLocalTime = (label?: string, outputFormat?: string) => {
  if (!label) return undefined;

  const inputFormat =
    label.includes("BST") || label.includes("GMT")
      ? "EEE d MMM yyyy, HH:mm XXX"
      : "EEE d MMM yyyy";

  if (inputFormat.length === 14 && outputFormat?.length === 5) return undefined;

  const time = label.replace("BST", "+01:00").replace("GMT", "+00:00");

  return format(
    parse(time, inputFormat, new Date()),
    outputFormat || "EEE d MMM yyyy, HH:mm",
  );
};
