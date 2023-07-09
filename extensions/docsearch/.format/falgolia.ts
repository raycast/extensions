import data from "../src/data/apis";

import fs from "fs";

function formatAlgoliaApiDataList() {
  const sortedData = data.sort((a, b) => (a.name > b.name ? 1 : -1));

  return JSON.stringify(sortedData, null, 2).replace(/"([^"]+)":/g, "$1:");
}

export default function formatAlgoliaApiData() {
  // read algolia api data
  var algoliaApiData = fs.readFileSync("./src/data/apis.ts", "utf8");

  // replace algolia api data
  algoliaApiData = algoliaApiData.replace(/<API\[\]>\[(.|\n)*\]/, `<API[]>${formatAlgoliaApiDataList()}`);

  // replace algolia api data
  fs.writeFileSync("./src/data/apis.ts", algoliaApiData);
}
