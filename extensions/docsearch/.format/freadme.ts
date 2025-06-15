import fs from "fs";
import { data, DocID, Tags } from "../src/data/apis";

function formatSupportedDocsTable() {
  const columns = 3
  let times = 0;
  const totalDocs = Object.keys(data).length
  const totalVersions = Object.keys(data).reduce((a, b) => a + Object.keys(data[parseInt(b) as DocID]).length, 0)
  let supportedDocsTable = `### Supported Documentations (${totalDocs} documentations | ${totalVersions} different versions)

| Documentations |   |   |
| :------------: |:-:|:-:|
`;

  // Sort data
  const sortedData = Object.fromEntries(Object.entries(data).sort(([a], [b]) => a.localeCompare(b)));

  Object.keys(sortedData).map((key) => {
    const id = parseInt(key)
    const docsName = DocID[id].replace('_', ' ');
    const items = sortedData[id]
    const item = items[Object.keys(items)[0] as Tags]!

    supportedDocsTable += `| [${docsName}](${item.homepage})`
    times++;

    if (times % columns === 0) {
      supportedDocsTable += " |\n";
    }
  });

  if (Object.keys(sortedData).length % columns !== 0) {
    supportedDocsTable += ' |'
  }

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
