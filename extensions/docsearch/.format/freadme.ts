import data from "../src/data/apis";

import fs from "fs";

function formatSupportedDocsTable() {
  var times = 0;
  var supportedDocsTable = `### Supported Documentations

| Documentations |   |   |
| :------------: |:-:|:-:|
`;

  // Sort data
  const sortedData = data.sort((a, b) => (a.name > b.name ? 1 : -1));

  sortedData.map((item) => {
    supportedDocsTable +=
      "lang" in item && item.lang
        ? `| [${item.name}(${item.lang})](${item.homepage})`
        : `| [${item.name}](${item.homepage})`;
    times++;
    if (times % 3 == 0) {
      supportedDocsTable += " |\n";
    }
  });
  return supportedDocsTable;
}

export default function formatReadme() {
  // read README.md
  var readme = fs.readFileSync("./README.md", "utf8");

  // replace supported docs table
  readme = readme.replace(/### Supported Documentations(.|\s)*?###/, `${formatSupportedDocsTable()}\n\n###`);

  // write README.md
  fs.writeFileSync("./README.md", readme);
}
