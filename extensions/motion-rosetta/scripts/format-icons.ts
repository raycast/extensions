import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

// Development only: checked-in sources make regeneration offline and repeatable.
// Provenance and trademark limitations are documented in SOURCES.md.
const source = "scripts/sources/formats";
const destination = "assets/formats";
mkdirSync(destination, { recursive: true });
for (const name of readdirSync(source).filter((name) =>
  name.endsWith(".svg"),
)) {
  writeFileSync(
    `${destination}/${name.replace(/\.svg$/, ".png")}`,
    new Resvg(readFileSync(`${source}/${name}`), {
      fitTo: { mode: "width", value: 64 },
    })
      .render()
      .asPng(),
  );
}
