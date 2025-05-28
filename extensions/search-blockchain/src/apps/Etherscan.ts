import { createExplorer } from "./utils";

export default createExplorer({
  url: "https://etherscan.io/search?q={query}",
});
