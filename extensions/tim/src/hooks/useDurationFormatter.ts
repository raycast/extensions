import parseMilliseconds from "parse-ms";
import { useLocale } from "../state/locale";
import { TimeFormat, usePreferences } from "./usePreferences";

type Time = {
  hours: number;
  minutes: number;
  seconds: number;
};

const FORMATTER: Record<TimeFormat, (time: Time, locale: string) => string> = {
  compact: ({ hours, minutes, seconds }, locale) =>
    `${formatInteger(hours, locale).padStart(2, "0")}:${padded(minutes)}:${padded(seconds)}`,
  "compact-short": ({ hours, minutes }, locale) =>
    `${formatInteger(hours, locale).padStart(2, "0")}:${padded(minutes)}`,
  float: ({ hours, minutes }, locale) => formatFloat(hours + minutes / 60, locale, 2),
  "float-short": ({ hours, minutes }, locale) => formatFloat(hours + minutes / 60, locale, 1),
  human: ({ hours, minutes, seconds }, locale) => `${formatInteger(hours, locale)}h ${minutes}m ${seconds}s`,
  "human-short": ({ hours, minutes }, locale) => `${formatInteger(hours, locale)}h ${minutes}m`,
};

export function useDurationFormatter() {
  const { timeFormat } = usePreferences();
  const locale = useLocale();

  const format = (ms: number) => {
    const { days, hours, minutes, seconds } = parseMilliseconds(ms);
    return FORMATTER[timeFormat](
      {
        hours: hours + days * 24,
        minutes,
        seconds,
      },
      locale,
    );
  };

  return { format };
}

function padded(number: number) {
  return number.toString().padStart(2, "0");
}

function formatFloat(float: number, locale: string, digits: 1 | 2) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(float);
}

function formatInteger(integer: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(integer);
}
