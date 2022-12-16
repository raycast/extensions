import data from "../src/algolia/apiData";

import fs from "fs";

function formatAlgoliaApiDataList() {
  const sortedData = data.sort((a, b) => (a.name > b.name ? 1 : -1));

  return JSON.stringify(sortedData, null, 2).replace(/"([^"]+)":/g, "$1:");
}

export default function formatAlgoliaApiData() {
  // read algolia api data
  var algoliaApiData = fs.readFileSync("./src/algolia/apiData.ts", "utf8");

  // replace algolia api data
  algoliaApiData = algoliaApiData.replace(/<IAPIData\[\]>\[(.|\n)*\]/, `<IAPIData[]>${formatAlgoliaApiDataList()}`);

  // replace algolia api data
  fs.writeFileSync("./src/algolia/apiData.ts", algoliaApiData);
}
