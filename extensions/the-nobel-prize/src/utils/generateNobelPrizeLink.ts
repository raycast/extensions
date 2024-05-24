import { NobelPrize, NobelPrizePerLaureate } from "../types";

export default function generateNobelPrizeLink(prize: NobelPrize | NobelPrizePerLaureate, fileName?: string) {
  const category = prize.category.en.toLowerCase();
  // Economic Sciences -> economic-sciences
  const categorySlug = category.includes("medicine") ? "medicine" : category.replaceAll(" ", "-");
  const page = fileName ? `${fileName}/facts` : "summary";
  return `https://nobelprize.org/prizes/${categorySlug}/${prize.awardYear}/${page}/`;
}
