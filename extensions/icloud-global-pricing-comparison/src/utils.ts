import { Image } from "@raycast/api";
import { Plan, PlanType, Region } from "./types";

// Utility functions

export const planTypes: PlanType[] = [
  { id: "0", name: "50GB", desc: "50GB Plan" },
  { id: "1", name: "200GB", desc: "200GB Plan" },
  { id: "2", name: "2TB", desc: "2TB Plan" },
  { id: "3", name: "6TB", desc: "6TB Plan" },
  { id: "4", name: "12TB", desc: "12TB Plan" },
];

export function sortPlansByCNY(data: Region[], planName: string) {
  const clonedData = JSON.parse(JSON.stringify(data));
  clonedData.sort((a: Region, b: Region) => {
    const planA = a.Plans.find((plan: Plan) => plan.Name === planName);
    const planB = b.Plans.find((plan: Plan) => plan.Name === planName);

    // Handle cases where planA or planB might be undefined
    if (planA && planB) {
      return planA.PriceInCNY - planB.PriceInCNY;
    } else if (planA) {
      return -1; // a should come before b if a has the plan and b does not
    } else if (planB) {
      return 1; // b should come before a if b has the plan and a does not
    } else {
      return 0; // Both do not have the plan, keep original order
    }
  });

  // Add rank field at the country level
  let rank = 1;
  clonedData.forEach((country: Region, index: number, array: Region[]) => {
    if (index > 0) {
      const prevPlan = array[index - 1].Plans.find((plan) => plan.Name === planName);
      const currentPlan = country.Plans.find((plan) => plan.Name === planName);
      if (prevPlan && currentPlan && prevPlan.PriceInCNY === currentPlan.PriceInCNY) {
        country.Rank = array[index - 1].Rank; // Same rank as previous country if prices are equal
      } else {
        country.Rank = rank++;
      }
    } else {
      country.Rank = rank++;
    }
  });

  return clonedData;
}

export function getFlagEmoji(countryISO: string) {
  // Convert ISO code to Unicode flag emoji
  const codePoints = countryISO.split("").map((char) => char.charCodeAt(0) - 65 + 0x1f1e6);
  return String.fromCodePoint(...codePoints);
}

export function getRankIcon(rank: number): Image.ImageLike {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
  <rect x="0" y="0" width="40" height="40" fill="#86c7cc" rx="10"></rect>
  <text  font-size="22"  fill="#282323"  font-family="Verdana"  text-anchor="middle"  alignment-baseline="baseline"  x="20.5"  y="32.5">${rank}</text>
</svg>
  `.replaceAll("\n", "");

  return {
    source: { light: `data:image/svg+xml,${svg}`, dark: `data:image/svg+xml,${svg}` },
  };
}
