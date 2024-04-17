import { encode } from "js-base64";

const cleanPercentage = (percentage: number) => {
  const isNegativeOrNaN = !Number.isFinite(+percentage) || percentage < 0; // we can set non-numbers to 0 here
  const isTooHigh = percentage > 100;
  return isNegativeOrNaN ? 0 : isTooHigh ? 100 : +percentage;
};

export const pie_svg = (percentage: number, colour: string) => {
  const pct = cleanPercentage(percentage);
  // dasharray offset goes from 722.2 to 0
  const offset = 722 - 722 * (pct / 100);

  const svg = `
  <svg width="250" height="250" viewBox="-31.25 -31.25 312.5 312.5" version="1.1" xmlns="http://www.w3.org/2000/svg" style="transform:rotate(-90deg)">
    <circle r="115" cx="125" cy="125" fill="transparent" stroke="transparent" stroke-width="50" stroke-dasharray="722px" stroke-dashoffset="0"></circle>
    <circle r="115" cx="125" cy="125" stroke="${colour}" stroke-width="50" stroke-linecap="butt" stroke-dashoffset="${offset}px" fill="transparent" stroke-dasharray="722.2px"></circle>
  </svg>
  `;
  return `data:image/svg+xml;base64,${encode(svg)}`;
};
