import data from "../src/data/apis";
import { API } from "../src/types";

import fs from "fs";

function generateFilePath(item: API) {
  return `./src/${item.name.toLowerCase() + (item.lang ? '_'+item.lang: '')}.tsx`.replace(' ','_')
}

export default function generateEntryFile() {
  const generateContent = (uuid: string) => 
  `import { SearchDocumentation } from "./components";\n\nexport default function Command(props: { arguments: { search?: string } }) {\n  return <SearchDocumentation id="${uuid}" quickSearch={props.arguments?.search} />;\n}`

  data.forEach((item) => {
    fs.writeFileSync(generateFilePath(item), generateContent(item.id))
  })
}

generateEntryFile()
