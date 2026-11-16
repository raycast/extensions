import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "node:fs";
const svg = readFileSync(new URL("./icon.svg", import.meta.url), "utf8");
writeFileSync(new URL("../assets/icon.png", import.meta.url), new Resvg(svg).render().asPng());
