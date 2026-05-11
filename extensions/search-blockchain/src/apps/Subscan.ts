import { createExplorer } from "./utils";

export default createExplorer({
  url: "https://polkadot.subscan.io/{type}/{query}",
  coin: "Polkadot",
  typeMap: {
    address: "account",
    transaction: "extrinsic",
  },
});
