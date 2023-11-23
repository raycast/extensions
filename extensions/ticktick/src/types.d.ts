// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IntentionalAny = any;

interface Preferences {
  defaultDate: "none" | "today" | "tomorrow" | "dayAfterTomorrow" | "nextWeek";
  defaultTitle: "none" | "clipboard" | "selection";
  autoFillEnabled: boolean;
}
