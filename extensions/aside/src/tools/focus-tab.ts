import { focusAsideTabById } from "../lib/applescript";
import { requireNonEmpty } from "../lib/tool-input";

type Input = {
  /** Exact live Aside tab ID returned by `get-tabs` or `get-active-tab`. Never infer or reuse it across browser restarts. */
  tabId: string;
};

/** Focus an Aside tab using the exact live ID returned by a tab read tool. */
export default async function tool(input: Input) {
  const tabId = requireNonEmpty(input.tabId, "Tab ID");
  return { tabId, status: await focusAsideTabById(tabId) };
}
