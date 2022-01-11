import fs from "fs";
import utils from "./utils";

const readme = `
# String Toolbox

![](https://user-images.githubusercontent.com/1155589/150677649-987747c9-1ddf-4017-8cc3-71cf42289684.png)

A Raycast extension for performing various operations on strings. Currently available utils:

${Object.values(utils)
  .map((util) => `- ${util.name}: ${util.description}`)
  .join("\n")}

## Attributions

### Inspiration

- [Boop](https://github.com/IvanMathy/Boop)
- [DevUtils.app](https://devutils.app/)

### Icons

<a href="https://www.flaticon.com/free-icons/yarn" title="yarn icons">Yarn icons created by Freepik - Flaticon</a>
<a href="https://www.flaticon.com/free-icons/link" title="link icons">Link icons created by Freepik - Flaticon</a>
<a href="https://www.flaticon.com/free-icons/sort-ascending" title="sort ascending icons">Sort ascending icons created by Andrean Prabowo - Flaticon</a>
<a href="https://www.flaticon.com/free-icons/descending" title="descending icons">Descending icons created by Andrean Prabowo - Flaticon</a>
<a href="https://www.flaticon.com/free-icons/uppercase" title="uppercase icons">Uppercase icons created by Smashicons - Flaticon</a>
<a href="https://www.flaticon.com/free-icons/lowercase" title="lowercase icons">Lowercase icons created by Smashicons - Flaticon</a>
<a href="https://www.flaticon.com/free-icons/doner-kebab" title="doner kebab icons">Doner kebab icons created by Freepik - Flaticon</a>
<a href="https://www.flaticon.com/free-icons/camel" title="camel icons">Camel icons created by Freepik - Flaticon</a>
<a href="https://www.flaticon.com/free-icons/snake" title="snake icons">Snake icons created by Freepik - Flaticon</a>
`;
fs.writeFileSync("README.md", readme);

export {};
