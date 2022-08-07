import { environment } from "@raycast/api";
import fs from "fs";

export interface Symbol {
  name: string;
  svg: string;
  symbol?: string;
  categories: string[];
}

export const getSymbols = (category: string | null) => {
  const symbolsJSON: { [key: string]: { categories: string[]; symbol: string } } = {};
  JSON.parse(fs.readFileSync(`${environment.assetsPath}/symbols.json`, { encoding: "utf8" })).map((symbol: any) => {
    symbolsJSON[symbol.name] = { categories: symbol.categories, symbol: symbol.symbol };
  });

  const symbols: Symbol[] = [];
  for (const file of fs.readdirSync(`${environment.assetsPath}/sf-symbols`)) {
    if (file.endsWith(".svg")) {
      const name = file.replace(".svg", "");
      if (name in symbolsJSON) {
        symbols.push({
          name: name,
          svg: `${environment.assetsPath}/sf-symbols/${file}`,
          ...symbolsJSON[name],
        });
      } else {
        symbols.push({
          name: name,
          svg: `${environment.assetsPath}/sf-symbols/${file}`,
          categories: [],
        });
      }
    }
  }

  return symbols.filter((symbol: Symbol) => category === null || symbol.categories.includes(category));
};

export const categories: { names: string[]; values: string[] } = {
  names: [
    "What's New",
    "Multicolor",
    "Communication",
    "Weather",
    "Objects & Tools",
    "Devices",
    "Gaming",
    "Connectivity",
    "Transportation",
    "Human",
    "Nature",
    "Editing",
    "Text Formatting",
    "Media",
    "Keyboard",
    "Commerce",
    "Time",
    "Health",
    "Shapes",
    "Arrows",
    "Indices",
    "Math",
  ],
  values: [
    "whatsnew",
    "multicolor",
    "communication",
    "weather",
    "objectsandtools",
    "devices",
    "gaming",
    "connectivity",
    "transportation",
    "human",
    "nature",
    "editing",
    "textformatting",
    "media",
    "keyboard",
    "commerce",
    "time",
    "health",
    "shapes",
    "arrows",
    "indices",
    "math",
  ],
};
