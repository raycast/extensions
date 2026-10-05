import { loadProviderEnvFiles, summarizeProviderKeyStatus } from "./lib/provider-env.mjs";

const loaded = loadProviderEnvFiles();
const providers = summarizeProviderKeyStatus(loaded);
const readyProviders = Object.entries(providers)
  .filter(([, info]) => info.status === "ready")
  .map(([provider]) => provider);

console.log(
  JSON.stringify(
    {
      status: readyProviders.length > 0 ? "ready" : "missing",
      readyProviders,
      providers,
      note: "No provider key values are printed. This command does not call provider APIs.",
    },
    null,
    2,
  ),
);

if (readyProviders.length === 0) {
  process.exit(1);
}
