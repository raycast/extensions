import { createExplorer } from "./utils";

export default createExplorer({
  url: "https://neoscan.io/{type}/{query}",
  coin: "NEO",
});
