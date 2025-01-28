import { usePreferences } from "./use-preferences";

export function useFormat() {
  const preferences = usePreferences();
  const dateFormat = Intl.DateTimeFormat(preferences.formatterLocale, {
    dateStyle: "medium",
    timeStyle: undefined,
  });
  const dateTimeFormat = Intl.DateTimeFormat(preferences.formatterLocale, {
    dateStyle: "short",
    timeStyle: "short",
  });

  return {
    dateFormat,
    dateTimeFormat,
  };
}
