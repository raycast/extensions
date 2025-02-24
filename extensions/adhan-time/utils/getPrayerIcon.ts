import { Icon } from "@raycast/api";

export function getPrayerIcon(prayer: string) {
  if(['Sunrise', 'Sunset'].includes(prayer)) {
    return Icon.Sunrise;
  }
  if (prayer === 'Firstthird') {
    return Icon.StackedBars1;
  }
  if (prayer === 'Lastthird') {
    return Icon.StackedBars3;
  }
  if (prayer === 'Imsak') {
    return Icon.CircleDisabled;
  }
  if (prayer === 'Midnight') {
    return Icon.Clock;
  }
  const morningPrayers = ['Sunrise', 'Dhuhr', 'Asr'];
  return morningPrayers.includes(prayer) ? Icon.Sun : Icon.Moon;
}
