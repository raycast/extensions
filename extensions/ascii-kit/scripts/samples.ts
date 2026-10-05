// Sample inputs per Compose kind, shared by `npm run examples` and `npm run readme`.
import type { Kind } from "../src/lib/formats";

export const SAMPLES: Record<Kind, string> = {
  tree: "src\n  components\n    Button.tsx\n    Card.tsx\n  hooks\n    useSearch.ts\n  index.ts",
  box: "Search panel\n---\nQuery input\nFilters\nResults list",
  table: "Option\tEffort\tRisk\nPatch in place\t1\tLow\nNew service\t5\tMedium",
  flow: "Draft > Review > Approved > Published",
  sequence: "Browser -> API: POST /search\nAPI -> Index: query\nIndex --> API: hits\nAPI --> Browser: 200 results",
  chart: "Mon 3\nTue 5\nWed 9\nThu 4\nFri 2\nSat 6",
  plan: "Sprint\nDiscovery 1 1\nDesign 2-3\nBuild 3 3.5\nLaunch 6.5 0.5",
  code: "const total = items.reduce(sum)\nitems.reduce: throws on an empty array\nsum: no initial value",
  text: "Release notes v2",
};
