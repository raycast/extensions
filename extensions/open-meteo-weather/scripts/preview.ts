// Dev-only: renders sample hero SVGs for visual inspection. Run with `npx tsx scripts/preview.ts`.
import { writeFileSync, mkdirSync } from "node:fs";
import { renderHero, HeroChartPoint } from "../src/lib/svg";
import { glyphFor, labelFor } from "../src/lib/palettes";
import { styleFor, ThemeId } from "../src/lib/themes";

const THEMES: ThemeId[] = ["atmosphere", "synthwave", "noir", "paper"];

// [name, WMO code, isDay]
const SAMPLES: [string, number, boolean][] = [
  ["clear-day", 0, true],
  ["clear-night", 0, false],
  ["partly", 2, true],
  ["rain", 63, true],
  ["snow", 73, true],
  ["storm", 95, true],
];

const chart: HeroChartPoint[] = Array.from({ length: 24 }, (_, i) => ({
  label: i === 0 ? "Now" : `${(22 + i) % 24}h`,
  temp: 14 + 7 * Math.sin(((i + 16) / 24) * Math.PI * 2) + Math.sin(i * 1.7) * 0.8,
}));

mkdirSync("/tmp/weather-previews", { recursive: true });
for (const theme of THEMES) {
  for (const [name, code, isDay] of SAMPLES) {
    const svg = renderHero({
      place: "Madrid, Comunidad de Madrid, Spain",
      dateLine: "Tuesday, Aug 25 · 22:45",
      temperature: 18.4,
      subline: "Feels like 17°  ·  H 24°  L 12°",
      conditionLabel: labelFor(code),
      unitSymbol: "C",
      glyph: glyphFor(code, isDay),
      style: styleFor(theme, code, isDay),
      chart,
      nowIndex: 0,
    });
    writeFileSync(`/tmp/weather-previews/${theme}-${name}.svg`, svg);
  }
}
console.log("done");
