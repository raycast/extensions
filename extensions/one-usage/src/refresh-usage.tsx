import { fetchAllProviders } from "./providers/registry";
import { writeCache } from "./usage-cache";

export default async function RefreshUsage() {
  const results = await fetchAllProviders();
  writeCache(results);
}
