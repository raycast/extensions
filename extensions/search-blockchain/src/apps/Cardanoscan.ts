import { createExplorer } from "./utils";

export default createExplorer({
  url: "https://cardanoscan.io/{type}/{query}",
  coin: "Cardano",
});
