/// <reference types="bun" />
/// <reference path="./svg.d.ts" />
import type { Element } from "../src/types";

import { rm } from "node:fs/promises";

import { format } from "prettier";
import { optimize } from "svgo";
import { yiq } from "yiq";

import prettierConfig from "../.prettierrc.json";
import elementSvg from "../assets/element.svg";

interface PubChemElements_all {
  Table: {
    Columns: {
      Column: string[];
    };
    Row: {
      Cell: string[];
    }[];
  };
}

const dataFile = Bun.file("assets/PubChemElements_all.json");
let data: PubChemElements_all;
try {
  data = await dataFile.json();
} catch (err) {
  if (err.code !== "ENOENT") {
    throw err;
  }

  const resp = await fetch("https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON").then((resp) => resp.text());

  await Bun.write("assets/PubChemElements_all.json", resp).then(() => {
    console.log("Downloaded PubChemElements_all.json");
  });

  data = JSON.parse(resp);
}

const optimizedElementSvg = optimize(elementSvg).data;

await rm("assets/elements", { force: true, recursive: true });
await rm("src/elements.ts", { force: true });

const elements: Element[] = [];
let elementsTs = `
import { Element } from "./types";

export const elements: Record<string, Element> = {
`;

for (const { Cell } of data.Table.Row) {
  // @ts-expect-error
  const element: Element = {};
  for (let i = 0; i < Cell.length; i++) {
    element[data.Table.Columns.Column[i]] = Cell[i];
  }
  elements.push(element);
  elementsTs += `${element.Symbol}: ${JSON.stringify(element)},`;

  let textColor: string;
  try {
    textColor = yiq(`#${element.CPKHexColor}`);
  } catch (err) {
    console.warn(err);
    textColor = "#FFF";
    element.CPKHexColor = "000";
  }

  const svg = optimizedElementSvg
    .replace(/#{TextColor}/g, textColor)
    .replace(/{{ (\w+) }}/g, (match, key) => element[key]);

  Bun.write(`assets/elements/${element.Symbol}.svg`, svg).then(() => {
    console.log(`Generated ${element.Symbol}.svg`);
  });
}

console.log(`Parsed ${elements.length} rows`);

elementsTs += "};\n";
await Bun.write("src/elements.ts", await format(elementsTs, { filepath: "src/elements.ts", ...prettierConfig })).then(
  () => {
    console.log("Generated elements.ts");
  },
);
