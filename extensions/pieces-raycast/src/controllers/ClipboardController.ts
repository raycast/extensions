import { Clipboard } from "@raycast/api";
import {
  ClassificationSpecificEnum,
  SeededAnnotation,
  SeededTag,
  SeededWebsite,
} from "@pieces.app/pieces-os-client";
import EnrichmentController from "./EnrichmentController";
import getClipboardSeed from "../utils/converters/getClipboardSeed";

export type ClipboardAsset = {
  clipboard: Clipboard.ReadContent;
  ext?: ClassificationSpecificEnum;
  name?: string;
  annotations?: SeededAnnotation[];
  websites?: SeededWebsite[];
  tags?: SeededTag[];
};

export default class ClipboardController extends EnrichmentController<ClipboardAsset> {
  private static instance: ClipboardController;

  private constructor() {
    super("clipboard-history");
  }

  /**
   * Generates a unique key for a given ClipboardAsset item.
   * The key is constructed by concatenating the file, html, and text properties of the clipboard.
   *
   * @param {ClipboardAsset} item - The ClipboardAsset item for which to generate the unique key.
   * @returns {string} The unique key generated from the clipboard properties.
   */
  protected getUniqueKey(item: ClipboardAsset): string {
    return (
      (item.clipboard.file ?? "") +
      (item.clipboard.html ?? "") +
      item.clipboard.text
    );
  }

  /**
   * Fetches items from the clipboard asynchronously.
   *
   * This method reads the clipboard at different offsets and retrieves the items.
   * It then processes each item to extract the clipboard seed.
   *
   * @returns {Promise<ClipboardAsset[]>} A promise that resolves to an array of clipboard assets.
   */
  protected async fetchItems(): Promise<ClipboardAsset[]> {
    const items = [];
    for (let i = 0; i < 5; i++) {
      items.push(Clipboard.read({ offset: 4 - i })); // read the clipboard at the ith offset
    }

    const clipboardItems = await Promise.all(items);

    return clipboardItems.map((el) => {
      return getClipboardSeed(el);
    });
  }

  public static getInstance() {
    return (this.instance ??= new ClipboardController());
  }
}
