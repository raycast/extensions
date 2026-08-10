export * from "./api";

/**
 * A key-value object of the known time ranges for the Wakatime Summary.
 * A `true` value means you can query for that range without a PRO subscription
 */
export const KNOWN_RANGES = {
  Today: true,
  Yesterday: true,
  "Last 7 Days": true,
  "Last 7 Days from Yesterday": true,
  "Last 14 Days": false,
  "Last 30 Days": false,
  "This Week": false,
  "Last Week": false,
  "This Month": false,
  "Last Month": false,
} as const;

export function getDuration(seconds: number | undefined | null) {
  const getAmount = (rem: number, rate: number, unit: string) => {
    const num = Math.floor(rem / rate);
    return [num === 0 ? "" : `${num} ${unit}`, Math.floor(rem - num * rate)] as const;
  };

  let rem = seconds;
  if (rem == null) return "0 sec";

  let [hours, minutes, sec] = ["", "", ""];

  [hours, rem] = getAmount(rem, 60 * 60, "hr");
  [minutes, rem] = getAmount(rem, 60, "min");
  [sec, rem] = getAmount(rem, 1, "sec");

  return [hours, minutes, sec].filter(Boolean).join(" ") || "0 sec";
}

/**
 * It takes a WakaTime summary object and a key, and returns an array of the top 5 items in that key, sorted by total time
 * @param obj - is the data from a WakaTime.Summary.
 * @param key - key to get data from
 * @returns An array of tuples, where the first element is the name of the item and the second element is the total seconds spent on that item.
 */
export function cumulateSummaryDuration(
  { data }: WakaTime.Summary,
  key: keyof Omit<(typeof data)[0], "grand_total" | "range">,
) {
  const obj = Object.entries(
    data
      .map((item) => item[key])
      .flat()
      .reduce(
        (acc, item) => {
          const { name = "", total_seconds = 0 } = item ?? {};
          return {
            ...acc,
            [name]: total_seconds + (acc[name] ?? 0),
          };
        },
        {} as { [name: string]: number },
      ),
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
