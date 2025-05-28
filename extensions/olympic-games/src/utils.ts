import { Image, List } from "@raycast/api";
import { MedalResult } from "./types";

function getMetalNumIcon(metalNumber: number): Image.ImageLike {
  function getMetalSvg(isLightTheme: boolean) {
    const textColor = isLightTheme ? "#5d5d5e" : "white";

    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
      <rect x="0" y="0" width="40" height="40" fill="transparent" rx="10"></rect>
      <text  font-size="30"  fill="${textColor}"  font-family="Verdana"  text-anchor="middle"  alignment-baseline="baseline"  x="20.5"  y="36.5">${metalNumber}</text>
    </svg>
      `.replaceAll("\n", "");
    return `data:image/svg+xml,${svg}`;
  }

  return { source: { light: getMetalSvg(true), dark: getMetalSvg(false) } };
}

function getRankIcon(rank: number): Image.ImageLike {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
  <rect x="0" y="0" width="40" height="40" fill="#DD7949" rx="10"></rect>
  <text  font-size="22"  fill="white"  font-family="Verdana"  text-anchor="middle"  alignment-baseline="baseline"  x="20.5"  y="32.5">${rank}</text>
</svg>
  `.replaceAll("\n", "");

  return {
    source: { light: `data:image/svg+xml,${svg}`, dark: `data:image/svg+xml,${svg}` },
  };
}

export function getAccessories(item: MedalResult) {
  const accessories = new Array<List.Item.Accessory>();

  accessories.push({ icon: { source: "🥇" } });
  accessories.push({ icon: getMetalNumIcon(item.medals.gold) });

  accessories.push({ icon: { source: "🥈" } });
  accessories.push({ icon: getMetalNumIcon(item.medals.silver) });

  accessories.push({ icon: { source: "🥉" } });
  accessories.push({ icon: getMetalNumIcon(item.medals.bronze) });

  accessories.push({ icon: getRankIcon(item.rank), tooltip: item.medals.total.toString() });

  return accessories;
}

export function getFlag(countryCode: string) {
  const flag_url = `https://codante.s3.amazonaws.com/codante-apis/olympic-games/flags/${countryCode}.png`;
  return flag_url;
}
