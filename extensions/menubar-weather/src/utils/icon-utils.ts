import { Color, Icon } from "@raycast/api";
import { iconStyle } from "./weather-utils";

enum IconStyle {
  RAYCAST = "raycast",
  SF_SYMBOLS = "sf-symbols",
}

//------------ weather icons ------------

// description: https://open-meteo.com
export const weatherDescriptions = new Map([
  [0, "Clear sky"],
  [1, "Mainly clear"],
  [2, "Partly cloudy"],
  [3, "Overcast"],
  [45, "Fog"],
  [48, "Depositing rime fog"],
  [51, "Light drizzle"],
  [53, "Moderate drizzle"],
  [55, "Dense intensity drizzle"],
  [56, "Light freezing drizzle"],
  [57, "Dense intensity freezing drizzle"],
  [61, "Slight rain"],
  [63, "Moderate rain"],
  [65, "Heavy intensity rain"],
  [66, "Light freezing rain"],
  [67, "Heavy intensity freezing rain"],
  [71, "Slight snow fall"],
  [73, "Moderate snow fall"],
  [75, "Heavy intensity snow fall"],
  [77, "Snow grains"],
  [80, "Slight rain showers"],
  [81, "Moderate rain showers"],
  [82, "Violent rain showers"],
  [85, "Slight snow showers"],
  [86, "Heavy snow showers"],
  [95, "Slight or moderate Thunderstorm"],
  [96, "slight thunderstorm"],
  [99, "Heavy hail thunderstorm"],
]);

// raycast style icons
const raycastWeatherIcons = new Map([
  [0, Icon.Sun],
  [1, Icon.CloudSun],
  [2, Icon.Cloud],
  [3, Icon.Cloud],
  [45, Icon.Snippets],
  [48, Icon.Snippets],
  [51, Icon.CloudRain],
  [53, Icon.CloudRain],
  [55, Icon.CloudRain],
  [56, Icon.CloudRain],
  [57, Icon.CloudRain],
  [61, Icon.CloudRain],
  [63, Icon.CloudRain],
  [65, Icon.CloudRain],
  [66, Icon.CloudRain],
  [67, Icon.CloudRain],
  [71, Icon.CloudSnow],
  [73, Icon.CloudSnow],
  [75, Icon.CloudSnow],
  [77, Icon.CloudSnow],
  [80, Icon.CloudRain],
  [81, Icon.CloudRain],
  [82, Icon.CloudRain],
  [85, Icon.CloudSnow],
  [86, Icon.CloudSnow],
  [95, Icon.CloudLightning],
  [96, Icon.CloudLightning],
  [99, Icon.CloudLightning],
]);

// sf symbols style icons
const sfSymbolsWeatherIcons = new Map([
  [0, "sun.max"],
  [1, "sun.max"],
  [2, "cloud.sun"],
  [3, "cloud"],
  [45, "cloud.fog"],
  [48, "cloud.fog"],
  [51, "cloud.drizzle"],
  [53, "cloud.drizzle"],
  [55, "cloud.drizzle"],
  [56, "cloud.sleet"],
  [57, "cloud.sleet"],
  [61, "cloud.rain"],
  [63, "cloud.heavyrain"],
  [65, "cloud.heavyrain"],
  [66, "cloud.sleet"],
  [67, "cloud.sleet"],
  [71, "cloud.snow"],
  [73, "cloud.snow"],
  [75, "cloud.snow"],
  [77, "cloud.snow"],
  [80, "cloud.rain"],
  [81, "cloud.heavyrain"],
  [82, "cloud.heavyrain"],
  [85, "cloud.snow"],
  [86, "cloud.snow"],
  [95, "cloud.bolt"],
  [96, "cloud.bolt.rain"],
  [99, "cloud.bolt.rain"],
]);

export function getWeatherIcon(weatherCode: number | undefined, isMenuBarIcon: boolean = false) {
  if (iconStyle === IconStyle.RAYCAST) {
    return { source: raycastWeatherIcons.get(weatherCode ?? 3) + "", tintColor: Color.PrimaryText };
  }

  const suffix = isMenuBarIcon ? ".fill.svg" : ".svg";
  return {
    source: "sf-weather-icons/" + sfSymbolsWeatherIcons.get(weatherCode ?? 3) + suffix,
    tintColor: Color.PrimaryText,
  };
}

//------------ menu icons ------------

// raycast style icons
const raycastMenuIcons = new Map([
  ["Temperature", Icon.Temperature],
  ["Min/Max", Icon.Temperature],
  ["Feels Like", Icon.Temperature],
  ["Humidity", Icon.Humidity],
  ["UVI", Icon.Sun],
  ["Pressure", Icon.CricketBall],
  ["Visibility", Icon.Eye],
  ["Speed", Icon.Gauge],
  ["Direction", Icon.Windsock],
  ["1Hour", Icon.Raindrop],
  ["Sunrise", Icon.Sunrise],
  ["Sunset", Icon.Moonrise],
  ["Street", Icon.AlignLeft],
  ["City", Icon.Building],
  ["Country", Icon.Map],
  ["Timezone", Icon.Globe],
  ["Lon, Lat", Icon.Geopin],
  ["Weather", Icon.Cloud],
  ["Wind", Icon.Wind],
  ["Precipitation", Icon.Raindrop],
  ["Source", Icon.BarChart],
  ["Last Updated", Icon.Download],
  ["Settings", Icon.Gear],
]);

// sf symbols style icons
const sfSymbolsMenuIcons = new Map([
  ["Temperature", "thermometer.medium"],
  ["Min/Max", "thermometer.medium"],
  ["Feels Like", "thermometer.medium"],
  ["Humidity", "humidity"],
  ["UVI", "sun.max"],
  ["Pressure", "barometer"],
  ["Visibility", "eye"],
  ["Speed", "gauge.with.dots.needle.67percent"],
  ["Direction", "flag"],
  ["1Hour", "drop"],
  ["Sunrise", "sunrise"],
  ["Sunset", "sunset"],
  ["Street", "signpost.right"],
  ["City", "building.2"],
  ["Country", "map"],
  ["Timezone", "globe"],
  ["Lon, Lat", "mappin.and.ellipse"],
  ["Weather", "cloud"],
  ["Wind", "wind"],
  ["Precipitation", "drop"],
  ["Source", "chart.xyaxis.line"],
  ["Last Updated", "arrow.down.to.line"],
  ["Settings", "gear"],
]);

export function getMenuIcon(title: string) {
  if (iconStyle === IconStyle.RAYCAST) {
    return { source: raycastMenuIcons.get(title) + "", tintColor: Color.PrimaryText };
  }

  return { source: "sf-menu-icons/" + sfSymbolsMenuIcons.get(title) + ".svg", tintColor: Color.PrimaryText };
}
