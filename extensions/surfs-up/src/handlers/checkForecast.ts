import { showToast, Toast } from "@raycast/api";
import { windguru as fetchWindguruForecast } from "wind-scrape";
import { Spot } from "../types/spot";
import { ForecastPanelInfo } from "../types/forecastPanelInfo";
import { Forecast } from "../types/forecast";
import { generateForecastPanelMarkdown } from "../utils/generateForecastPanelMarkdown";
import { chooseForecastModelsToUse } from "../utils/chooseForecastModelsToUse";
import { buildForecast } from "../utils/buildForecast";
import Style = Toast.Style;

export async function checkForecast(
  spot: Spot,
  when: keyof Forecast,
  setIsLoadingForecast: (isLoading: boolean) => void,
  setForecastPanelInfo: (forecastPanelInfo: ForecastPanelInfo) => void,
  setForecastPanelMarkdown: (markdown?: string) => void
) {
  setIsLoadingForecast(true);
  setForecastPanelInfo({ isShowing: true, spotId: spot.id });
  showToast(Style.Success, "Forecast fetched! You can check for today, tomorrow and after.");
  try {
    const data = await fetchWindguruForecast(spot.id);
    const { weatherModel, wavesModel } = chooseForecastModelsToUse(data);
    const forecast = buildForecast(weatherModel, wavesModel);
    setForecastPanelMarkdown(generateForecastPanelMarkdown(spot, forecast, when));
  } catch (e) {
    await showToast(Style.Failure, "Oops. We couldn't fetch the weather data!");
  } finally {
    setIsLoadingForecast(false);
  }
}
