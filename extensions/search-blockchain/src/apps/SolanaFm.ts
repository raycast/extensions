import { createExplorer } from "./utils";

export default createExplorer({
  url: "https://solana.fm/{type}/{query}",
  coin: "Solana",
  typeMap: {
    transaction: "tx",
  },
});
