import { Icon, Image } from "@raycast/api";
import { iconStyle } from "./weather-utils";
import ImageLike = Image.ImageLike;

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
const sfSymbolsWeatherIconMap = new Map([
  [0, "sun-max.png"],
  [1, "sun-max.png"],
  [2, "cloud-sun.png"],
  [3, "cloud.png"],
  [45, "cloud-fog.png"],
  [48, "cloud-fog.png"],
  [51, "cloud-drizzle.png"],
  [53, "cloud-drizzle.png"],
  [55, "cloud-drizzle.png"],
  [56, "cloud-sleet.png"],
  [57, "cloud-sleet.png"],
  [61, "cloud-rain.png"],
  [63, "cloud-heavyrain.png"],
  [65, "cloud-heavyrain.png"],
  [66, "cloud-sleet.png"],
  [67, "cloud-sleet.png"],
  [71, "cloud-snow.png"],
  [73, "snowflake.png"],
  [75, "snowflake.png"],
  [77, "snowflake.png"],
  [80, "cloud-rain.png"],
  [81, "cloud-heavyrain.png"],
  [82, "cloud-heavyrain.png"],
  [85, "snowflake.png"],
  [86, "snowflake.png"],
  [95, "bolt.png"],
  [96, "bolt.png"],
  [99, "cloud-hail.png"],
]);

function getSfSymbolWeatherIconWithTheme(folder: string, folderDark: string, weatherCode: number): ImageLike {
  return {
    source: {
      light: folder + sfSymbolsWeatherIconMap.get(weatherCode),
      dark: folderDark + sfSymbolsWeatherIconMap.get(weatherCode),
    },
  };
}

function getSfSymbolWeatherIcon(weatherCode: number) {
  return getSfSymbolWeatherIconWithTheme("sf-weather-icons/", "sf-weather-icons-dark/", weatherCode);
}

export function getWeatherIcons(weatherCode: number) {
  if (iconStyle === IconStyle.RAYCAST) {
    return raycastWeatherIcons.get(weatherCode);
  } else {
    return getSfSymbolWeatherIcon(weatherCode);
  }
}

export function getDefaultWeatherIcons() {
  return {
    description: "No weather info",
    icon: {
      source: {
        light: "menubar-icon.png",
        dark: "menubar-icon@dark.png",
      },
    },
  };
}

//------------ menu icons ------------

// raycast style icons
const raycastMenuIcons = new Map([
  ["Temperature", Icon.Temperature],
  ["Feels-like", Icon.Temperature],
  ["Min/Max", Icon.Temperature],
  ["UVI", Icon.Sun],
  ["Pressure", Icon.CricketBall],
  ["Humidity", Icon.Raindrop],
  ["Visibility", Icon.Eye],
  ["Speed", Icon.Gauge],
  ["Direction", Icon.Flag],
  ["1Hour", Icon.Raindrop],
  ["Sunrise", Icon.Sunrise],
  ["Sunset", Icon.Moon],
  ["City", Icon.ChessPiece],
  ["Country", Icon.BankNote],
  ["Timezone", Icon.CircleProgress50],
  ["Lon, Lat", Icon.EditShape],
  ["Lon, Lat", Icon.EditShape],
  ["Weather", Icon.Cloud],
  ["Wind", Icon.Boat],
  ["Rain", Icon.Raindrop],
  ["Source", Icon.BarChart],
  ["Detect Time", Icon.Download],
  ["Preferences", Icon.Gear],
]);

// sf symbols style icons
const sfSymbolsMenuIcons = new Map([
  ["Temperature", "temperature.png"],
  ["Feels-like", "temperature.png"],
  ["Min/Max", "temperature.png"],
  ["UVI", "uvi.png"],
  ["Pressure", "pressure.png"],
  ["Humidity", "humidity.png"],
  ["Visibility", "visibility.png"],
  ["Speed", "speed.png"],
  ["Direction", "direction.png"],
  ["1Hour", "rain.png"],
  ["Sunrise", "sunrise.png"],
  ["Sunset", "sunset.png"],
  ["City", "city.png"],
  ["Country", "country.png"],
  ["Timezone", "timezone.png"],
  ["Lon, Lat", "lonlat.png"],
  ["Lon, Lat", "lonlat.png"],
  ["Weather", "weather.png"],
  ["Wind", "wind.png"],
  ["Rain", "rain.png"],
  ["Source", "source.png"],
  ["Detect Time", "detect.png"],
  ["Preferences", "prefs.png"],
]);

function getSfSymbolMenuIconWithTheme(folder: string, folderDark: string, title: string): ImageLike {
  return {
    source: {
      light: folder + sfSymbolsMenuIcons.get(title),
      dark: folderDark + sfSymbolsMenuIcons.get(title),
    },
  };
}

function getSfSymbolMenuIcon(title: string) {
  return getSfSymbolMenuIconWithTheme("sf-menu-icons/", "sf-menu-icons-dark/", title);
}

export function getMenuIcon(title: string) {
  if (iconStyle === IconStyle.RAYCAST) {
    return raycastMenuIcons.get(title);
  } else {
    return getSfSymbolMenuIcon(title);
  }
}
