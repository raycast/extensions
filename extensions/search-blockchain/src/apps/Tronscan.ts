import { createExplorer } from "./utils";

export default createExplorer({
  url: "https://tronscan.org/{type}/{query}",
  coin: "Tron",
});
