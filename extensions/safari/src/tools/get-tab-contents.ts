import { setTimeout } from "timers/promises";
import { ContentType, readPinnedTabContents, resolveTab, TabContents } from "../safari";

const DEFAULT_MAX_LENGTH = 20000;
const MAX_LENGTH_CAP = 50000;
const LOADING_TIMEOUT_MS = 5000;
const LOADING_POLL_MS = 250;

type Input = {
  /**
   * The tab to get the contents of.
   * @remarks
   * If not provided, the currently focused/active tab will be used.
   */
  tab?: {
    /**
     * The window ID of the tab.
     * @remarks
     * Safari windows are numbered starting from 1.
     */
    windowId: number;

    /**
     * The index of the tab within the window.
     * @remarks
     * Tabs are numbered starting from 1, from left to right.
     */
    index: number;
  };

  /**
   * The type of content to retrieve from the tab.
   * @default "text"
   * @remarks
   * - "text" returns the visible text content (recommended for most uses)
   * - "source" returns the HTML source code (use only when HTML analysis is needed)
   */
  type?: ContentType;

  /**
   * The maximum number of characters to return.
   *
   * @default 20000
   * @remarks
   * Capped at 50000. Longer content is truncated. Pass a smaller value when the user only needs the start of the page,
   * such as "the first 500 characters".
   */
  maxLength?: number;
};

/**
 * Retrieves the contents of a Safari tab, either the specified tab or the currently focused tab.
 * Returns either the visible text or HTML source code based on the type parameter.
 * `truncated` is true when the content was cut at maxLength.
 */
export default async function tool(input: Input) {
  const { type = "text" } = input;
  const maxLength = Number.isFinite(input.maxLength)
    ? Math.min(Math.max(Math.floor(input.maxLength as number), 1), MAX_LENGTH_CAP)
    : DEFAULT_MAX_LENGTH;

  // Resolve the tab once, then read exactly that tab while waiting for it to load
  const tab = await resolveTab(input.tab);
  const deadline = Date.now() + LOADING_TIMEOUT_MS;
  let page: TabContents;
  for (;;) {
    page = await readPinnedTabContents(tab, type, maxLength);
    const waiting = page.readyState === "loading" || (page.readyState === "unknown" && !page.hasContent);
    if (!waiting || Date.now() >= deadline) break;
    await setTimeout(LOADING_POLL_MS);
  }

  const loading = page.readyState === "loading";
  // Check the full content, not the truncated prefix, which may be only whitespace
  if (!page.hasContent) {
    if (loading) {
      throw new Error(`"${page.title || tab.url}" is still loading. Try again in a moment.`);
    }
    throw new Error(
      `Couldn't read "${page.title || tab.url}": the page has no ${type === "text" ? "visible text" : "source"}. It may still be loading, need JavaScript that is turned off in Safari, or be a Safari page such as the Start Page, which can't be read.`,
    );
  }

  const truncated = page.length > maxLength;
  return {
    title: page.title,
    url: tab.url,
    windowId: tab.windowId,
    index: tab.index,
    type,
    loading,
    truncated,
    length: page.length,
    ...(truncated && {
      note: `Only the first ${maxLength} of ${page.length} characters are included. Say that the answer is based on the beginning of the page.`,
    }),
    content: page.content,
  };
}
