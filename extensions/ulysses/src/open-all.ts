import { ulyssesUrl } from "./ulysses-url";
import { openUlyssesCallback } from "./utils";

export default async function OpenAll() {
  // Current Ulysses ignores open-all, but opens the All view by name.
  // open-all stays as the fallback for older versions and other languages.
  await openUlyssesCallback(ulyssesUrl("open", { id: "All", "x-error": ulyssesUrl("open-all") }));
}
