import { providerTitle } from "./providers";
export type ChartChoice = {
  value: string;
  title: string;
  group: string;
  icon: "forecast" | "drain" | "details" | "limits" | "overview" | "provider" | "window";
};
export function chartChoices(providers: string[], windows: string[]): ChartChoice[] {
  return [
    ...[1, 3, 7].map((days) => ({
      value: `forecast:${days}`,
      title: `Forecast · ${days} ${days === 1 ? "day" : "days"}`,
      group: "Forecast",
      icon: "forecast" as const,
    })),
    ...[1, 7, 28].map((days) => ({
      value: `drain:${days}`,
      title: `Drain · ${days === 1 ? "24 hours" : `${days} days`}`,
      group: "Drain Rate",
      icon: "drain" as const,
    })),
    ...providers.map((provider) => ({
      value: `provider:${provider}`,
      title: providerTitle(provider),
      group: "Provider",
      icon: "provider" as const,
    })),
    ...windows.map((window) => ({
      value: `window:${window}`,
      title: window,
      group: "Quota Window",
      icon: "window" as const,
    })),
    ...(["details", "limits", "overview"] as const).map((view) => ({
      value: `view:${view}`,
      title: view[0].toUpperCase() + view.slice(1),
      group: "Account Views",
      icon: view,
    })),
  ];
}
