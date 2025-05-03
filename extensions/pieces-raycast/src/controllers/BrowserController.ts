import { URL } from "url";
import { BrowserExtension } from "@raycast/api";
import {
  ClassificationSpecificEnum,
  SeededAnnotation,
  SeededTag,
  SeededWebsite,
} from "@pieces.app/pieces-os-client";
import EnrichmentController from "./EnrichmentController";

type TabWithCode = {
  tab: BrowserExtension.Tab;
  code: string;
};

export type BrowserAsset = {
  browser: TabWithCode;
  ext?: ClassificationSpecificEnum;
  name?: string;
  annotations?: SeededAnnotation[];
  websites?: SeededWebsite[];
  tags?: SeededTag[];
};

export default class BrowserController extends EnrichmentController<BrowserAsset> {
  private static instance: BrowserController;

  private constructor() {
    super("browser-history");
  }

  /**
   * Fetches items from the browser tabs.
   *
   * This method retrieves all open browser tabs and attempts to extract content
   * from each tab using a specified CSS selector. The extracted content is then
   * stored along with the tab information in a list of browser assets.
   *
   * @returns {Promise<BrowserAsset[]>} A promise that resolves to an array of browser assets.
   */
  protected async fetchItems(): Promise<BrowserAsset[]> {
    const browserTabs = await BrowserExtension.getTabs();

    /**
     * Fetches content from a given browser tab and adds it to the list of browser assets.
     *
     * @param {BrowserExtension.Tab} tab - The browser tab to fetch content from.
     * @returns {Promise<{ browser: TabWithCode } | undefined>} A promise that resolves to an object containing the tab and its content, or undefined if no content was found.
     */
    const fetchAndAddTab = async (tab: BrowserExtension.Tab) => {
      const code = await BrowserExtension.getContent({
        tabId: tab.id,
        cssSelector: "pre",
        format: "text",
      }).catch(() => null);

      if (!code?.length) return;

      const browser: TabWithCode = {
        code,
        tab,
      };

      return { browser };
    };

    const promises = browserTabs.map((el) => fetchAndAddTab(el));

    const tabs: BrowserAsset[] = [];
    for (const promise of promises) {
      const tab = await promise;

      if (!tab) continue;

      tabs.push(tab);
    }

    return tabs;
  }

  /**
   * Generates a unique key for a given BrowserAsset item.
   *
   * @param {BrowserAsset} item - The browser asset item for which to generate the unique key.
   * @returns {string} The unique key generated from the item's URL.
   */
  protected getUniqueKey(item: BrowserAsset): string {
    const url = new URL(item.browser.tab.url);
    return url.href;
  }

  public static getInstance() {
    return (this.instance ??= new BrowserController());
  }
}
