export const runtimeFilters = {
  deno: "runtime:deno",
  node: "runtime:node",
  browsers: "runtime:browsers",
  workerd: "runtime:workerd",
  bun: "runtime:bun",
} as const;

export const runtimeFilterValues = Object.values(runtimeFilters) as readonly string[];
