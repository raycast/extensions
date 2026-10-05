import { createNewTab, openUrlInAside } from "../lib/applescript";
import { normalizeAndValidateURL } from "../lib/url";

type Input = {
  /** Optional URL or hostname to open. Omit it to open a blank Aside tab. */
  url?: string;
};

/** Open a blank Aside tab or open a URL in a new Aside tab. */
export default async function tool(input: Input) {
  if (!input.url?.trim()) {
    await createNewTab();
    return { ok: true as const, openedUrl: null };
  }

  const openedUrl = normalizeAndValidateURL(input.url);
  await openUrlInAside(openedUrl);
  return { ok: true as const, openedUrl };
}
