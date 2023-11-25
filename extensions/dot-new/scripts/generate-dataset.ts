/* eslint-disable @typescript-eslint/no-var-requires */
import path from "path/posix";
import { writeFileSync } from "fs";
import { Tabletojson } from "tabletojson";

const { flattenDeep } = require("lodash");

const datasetOutputPath = path.resolve(__dirname, "../assets/dataset.json");

type DataSet = Record<number, string>[][];

Tabletojson.convertUrl("https://whats.new/shortcuts/", (tablesAsJson: DataSet) => {
  const data = flattenDeep(
    tablesAsJson.map((tables) =>
      tables.map((table) => {
        const { 0: urls, 1: provider, 2: text } = table;
        const prepUrls = urls.split(" ").filter(Boolean);

        return prepUrls.map((url) => ({ url, provider, text }));
      })
    )
  );

  writeFileSync(datasetOutputPath, JSON.stringify(data));
});
