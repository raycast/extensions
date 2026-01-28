import { clearCache } from "./helpers/clear-cache";

export default async function Command() {
  await clearCache();
}
