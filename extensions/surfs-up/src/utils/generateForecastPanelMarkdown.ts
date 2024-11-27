import { WindguruModelHour } from "wind-scrape/dist/interfaces/windguru";
import leftPad from "left-pad";
import { Spot } from "../types/spot";
import { FORECAST_KEY_TRANSLATIONS, Forecast } from "../types/forecast";
import { WEATHER_PROPERTIES, WEATHER_PROPERTY_TRANSLATIONS } from "../data/weatherModels";
import { WAVE_PROPERTIES, WAVE_PROPERTY_TRANSLATIONS } from "../data/waveModels";

function generateWeatherForecastTableMarkdown(modelName: string, modelHour: WindguruModelHour): string {
  let tableMarkdown = `| **Weather** | Model: **${modelName}** |
| ----------- | ----------- |
`;

  tableMarkdown += WEATHER_PROPERTIES.map(
    (weatherProperty) =>
      `| ${WEATHER_PROPERTY_TRANSLATIONS[weatherProperty]} | ${modelHour ? modelHour[weatherProperty] : "-"} |`
  ).join("\n");

  return tableMarkdown;
}

function generateWavesForecastTableMarkdown(modelName: string, modelHour: WindguruModelHour): string {
  let tableMarkdown = `| **Waves** | Model: **${modelName}** |
| ----------- | ----------- |
`;

  tableMarkdown += WAVE_PROPERTIES.map(
    (waveProperty) => `| ${WAVE_PROPERTY_TRANSLATIONS[waveProperty]} | ${modelHour ? modelHour[waveProperty] : "-"} |`
  ).join("\n");

  return tableMarkdown;
}

function generateHourForecastMarkdown(
  weatherModelName: string,
  weatherModelHour: WindguruModelHour,
  wavesModelName: string,
  wavesModelHour: WindguruModelHour
) {
  return `\n> \n**Hour: ${leftPad(weatherModelHour.hour, 2, "0")}:00h**\n\n ---\n> 

${generateWeatherForecastTableMarkdown(weatherModelName, weatherModelHour)}

${generateWavesForecastTableMarkdown(wavesModelName, wavesModelHour)}`;
}

export function generateForecastPanelMarkdown(spot: Spot, forecast: Forecast, when: keyof Forecast) {
  return `
# ${spot.location} forecast for ${FORECAST_KEY_TRANSLATIONS[when]}

${forecast[when].weather.hours.map((weatherModelHour, index) =>
  generateHourForecastMarkdown(
    forecast[when].weather.modelName as string,
    weatherModelHour,
    forecast[when].waves.modelName as string,
    forecast[when].waves.hours[index]
  )
)}
  `;
}
