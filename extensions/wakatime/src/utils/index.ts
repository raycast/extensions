export * from "./api";

export function getDuration(seconds: number) {
  const getAmount = (rate: number, unit: string) => {
    const num = Math.floor(seconds / rate);
    seconds = Math.floor(seconds - num * rate);
    return num === 0 ? "" : `${num} ${unit}`;
  };

  const hours = getAmount(60 * 60, "hr");
  const minutes = getAmount(60, "min");
  const sec = getAmount(1, "sec");

  const duration = [hours, minutes, sec].filter(Boolean).join(" ");

  return duration || "0 sec";
}

/**
 * It takes a WakaTime summary object and a key, and returns an array of the top 5 items in that key, sorted by total time
 * @param obj - is the data from a WakaTime.Summary.
 * @param key - key to get data from
 * @returns An array of tuples, where the first element is the name of the item and the second element is the total seconds spent on that item.
 */
export function cumulateSummaryDuration(
  { data }: WakaTime.Summary,
  key: keyof Omit<typeof data[0], "grand_total" | "range">
) {
  const obj = Object.entries(
    data
      .map((item) => item[key])
      .flat()
      .reduce((acc, item) => {
        const { name = "", total_seconds = 0 } = item ?? {};
        return {
          ...acc,
          [name]: total_seconds + (acc[name] ?? 0),
        };
      }, {} as { [name: string]: number })
  ).sort((a, b) => b[1] - a[1]);

  return obj.slice(0, 5);
}

/**
 * It takes a country code, converts it to uppercase, splits it into an array of characters, maps each
 * character to its corresponding code point, and then returns a string of the code points
 * @param {string} countryCode - The country code of the country you want to get the flag emoji for.
 * @returns An emoji for the country code passed in.
 */
export function getFlagEmoji(countryCode: string) {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));

  return String.fromCodePoint(...codePoints);
}
