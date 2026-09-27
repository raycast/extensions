// Copies the browser builds of Mermaid and ECharts from node_modules into
// assets/vendor, where the Render Chart command and the thumbnail script load
// them from, and converts the world-atlas countries to GeoJSON as a script that
// registers the map with ECharts. Run after bumping any of them: npm run vendor.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { feature } from "topojson-client";

const root = fileURLToPath(new URL("..", import.meta.url));
const outDir = join(root, "assets", "vendor");
mkdirSync(outDir, { recursive: true });

const files = [
  ["mermaid", join("dist", "mermaid.min.js")],
  ["echarts", join("dist", "echarts.min.js")],
];
for (const [pkg, file] of files) {
  const { version } = JSON.parse(readFileSync(join(root, "node_modules", pkg, "package.json"), "utf8"));
  copyFileSync(join(root, "node_modules", pkg, file), join(outDir, `${pkg}.min.js`));
  console.log(`${pkg} ${version} -> assets/vendor/${pkg}.min.js`);
}

const topology = JSON.parse(readFileSync(join(root, "node_modules", "world-atlas", "countries-110m.json"), "utf8"));
const countries = feature(topology, topology.objects.countries);

// Rings that cross the antimeridian (Russia, Fiji) draw as a line across the
// whole map. Unwrapping their western points past 180 keeps each ring whole.
// Antarctica genuinely spans the width and stays as it is.
function unwrap(ring) {
  const crosses = ring.some(([lon]) => lon > 170) && ring.some(([lon]) => lon < -170);
  if (!crosses) return ring;
  const unwrapped = ring.map(([lon, lat]) => [lon < 0 ? lon + 360 : lon, lat]);
  const lons = unwrapped.map(([lon]) => lon);
  return Math.max(...lons) - Math.min(...lons) < 180 ? unwrapped : ring;
}
for (const { geometry } of countries.features) {
  if (geometry.type === "Polygon") geometry.coordinates = geometry.coordinates.map(unwrap);
  if (geometry.type === "MultiPolygon") geometry.coordinates = geometry.coordinates.map((polygon) => polygon.map(unwrap));
}
const maps = { world: countries };
writeFileSync(join(outDir, "maps.js"), `window.CHARTER_MAPS = ${JSON.stringify(maps)};\n`);
console.log(`world-atlas 110m (${countries.features.length} countries) -> assets/vendor/maps.js`);
