import { createExplorer } from "./utils";

export default createExplorer({
  url: "https://xrpscan.com/{type}/{query}",
  coin: "XRP",
  typeMap: {
    transaction: "tx",
  },
});
