import StreamController from "./StreamController";
import { Cache } from "@raycast/api";
import { BrowserAsset } from "./BrowserController";
import { ClipboardAsset } from "./ClipboardController";
import ContextService from "../connection/Context";
import { Seed, SeedTypeEnum } from "@pieces.app/pieces-os-client";
import ConnectorSingleton from "../connection/ConnectorSingleton";

export default abstract class EnrichmentController<
  T extends BrowserAsset | ClipboardAsset,
> {
  private uniqueItems = new Set<string>();

  private cache = new Cache();

  private itemHistory: Array<T> = [];

  private draftQueue = new Array<number>(); // index of assets in this.clipboardHistory that need to be drafted

  private enriching = false;

  public readonly controller = new StreamController<T[]>();

  constructor(protected readonly CACHE_KEY: string) {
    const items = JSON.parse(
      this.cache.get(this.CACHE_KEY) ?? "[]",
    ) as Array<T>;

    for (const item of items) {
      if (!item.ext) this.draftQueue.push(this.itemHistory.length);
      this.itemHistory.push(item);
      this.uniqueItems.add(this.getUniqueKey(item));
    }

    this.controller.add(this.itemHistory);
    this.enrichAssets();
  }

  /**
   * Abstract method to retrieve a unique key for a given item.
   * This method must be implemented by subclasses to provide
   * a unique identifier for each item of type T.
   *
   * @param item - The item for which to retrieve the unique key.
   * @returns A string representing the unique key for the given item.
   */
  protected abstract getUniqueKey(item: T): string;

  /**
   * Fetches a list of items.
   *
   * @returns {Promise<T[]>} A promise that resolves to an array of items of type T.
   */
  protected abstract fetchItems(): Promise<T[]>;

  /**
   * This will return some clipboard history items
   * @param length the number of items to fetch
   * @returns an array of clipboard history items
   */
  getHistory(length?: number) {
    return this.itemHistory.slice(0, length);
  }

  /**
   * Asynchronously enriches assets by processing items in the draft queue.
   * Ensures that only one enrichment process runs at a time.
   *
   * @private
   * @async
   * @returns {Promise<void>}
   */
  private async enrichAssets(): Promise<void> {
    if (this.enriching) {
      return;
    }
    this.enriching = true;

    while (this.draftQueue.length) {
      const index = this.draftQueue.shift()!;

      const currentItem = this.itemHistory[index];

      // If item already has an ext, skip processing
      if (currentItem.ext) continue;

      const draft = await this.draftText(
        "browser" in currentItem
          ? currentItem.browser.code
          : currentItem.clipboard.text,
      );

      if (!draft) {
        this.draftQueue.unshift(index);
        return;
      }

      this.mergeMetadata(currentItem, draft);

      this.itemHistory[index] = currentItem;
      this.controller.add(this.itemHistory);
      this.cache.set(this.CACHE_KEY, JSON.stringify(this.itemHistory));
    }
    this.enriching = false;
  }

  /**
   * This function will update our stored clipboard history
   */
  async updateHistory() {
    const items = await this.fetchItems();

    const initialLength = this.itemHistory.length; // initial length used for

    for (const item of items) {
      if (this.uniqueItems.has(this.getUniqueKey(item))) {
        continue;
      }

      this.itemHistory.unshift(item);
      this.uniqueItems.add(this.getUniqueKey(item));
    }

    // we will max out this list at 30 items
    // this length difference is how many items we added to the list
    const lengthDifference = this.itemHistory.length - initialLength;

    this.itemHistory = this.itemHistory.slice(0, 30); // max the array at 30 items

    for (let i = 0; i < lengthDifference; i++) {
      this.draftQueue.unshift(i);
    }

    for (let i = lengthDifference; i < this.draftQueue.length; i++) {
      if (this.draftQueue[i] + lengthDifference > 30) {
        this.draftQueue.splice(i);
      } else {
        this.draftQueue[i] += lengthDifference;
      }
    }

    this.cache.set(this.CACHE_KEY, JSON.stringify(this.itemHistory));

    this.controller.add(this.itemHistory);
    this.enrichAssets();
  }

  /**
   * Drafts a text asset for the application.
   *
   * @param text - The text content to be drafted.
   * @returns A promise that resolves to the drafted asset or null if the application is not available.
   */
  private async draftText(text: string) {
    const application = await ContextService.getInstance().getApplication();

    if (!application) return null;

    return ConnectorSingleton.getInstance().assetsApi.assetsDraft({
      seed: {
        type: SeedTypeEnum.SeededAsset,
        asset: {
          application,
          format: {
            file: {
              string: {
                raw: text,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Merges metadata from a draft asset into a given item.
   *
   * @param item - The item to which metadata will be merged. Can be of type ClipboardAsset or BrowserAsset.
   * @param draft - The draft containing the asset with metadata to merge.
   */
  private mergeMetadata(item: ClipboardAsset | BrowserAsset, draft: Seed) {
    item.ext =
      draft.asset?.format.file?.metadata?.ext ??
      draft.asset?.format.fragment?.metadata?.ext;

    item.name = draft.asset?.metadata?.name;
    item.annotations = draft.asset?.metadata?.annotations;
    item.tags = draft.asset?.metadata?.tags;
    item.websites = draft.asset?.metadata?.websites;
  }
}
