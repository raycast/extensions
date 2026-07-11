import { ForecastPanelInfo } from "../types/forecastPanelInfo";

export function closeForecast(
  setForecastPanelInfo: (detail: ForecastPanelInfo) => void,
  setForecastPanelMarkdown: (markdown?: string) => void
) {
  setForecastPanelInfo({ isShowing: false, spotId: 0 });
  setForecastPanelMarkdown(undefined);
}
