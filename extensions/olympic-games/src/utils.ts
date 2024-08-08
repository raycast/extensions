import { Image, List } from "@raycast/api";
import { MedalResult } from "./types";

export function getAccessories(props: { item: MedalResult; index: number }) {
  const accessories = new Array<List.Item.Accessory>();

  accessories.push({ icon: { source: "🥇" }, text: getMedalNumber(props.item.medals.gold) });
  accessories.push({ icon: { source: "🥈" }, text: getMedalNumber(props.item.medals.silver) });
  accessories.push({ icon: { source: "🥉" }, text: getMedalNumber(props.item.medals.bronze) });
  accessories.push({ icon: getRankIcon(props.item.rank), text: getMedalNumber(props.item.medals.total) });

  return accessories;
}

export function getMedalNumber(number: number) {
  return String(number).padStart(5, " ");
}

export function getRankIcon(rank: number): Image.ImageLike {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
  <rect x="0" y="0" width="40" height="40" fill="#DD7949" rx="10"></rect>
  <text  font-size="22"  fill="white"  font-family="Verdana"  text-anchor="middle"  alignment-baseline="baseline"  x="20.5"  y="32.5">${rank}</text>
</svg>
  `.replaceAll("\n", "");

  return {
    source: `data:image/svg+xml,${svg}`,
  };
}
