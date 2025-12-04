import { createExplorer } from "./utils";

export default createExplorer({
  url: "https://explorer.ont.io/{type}/{query}",
  coin: "Ontology",
});
