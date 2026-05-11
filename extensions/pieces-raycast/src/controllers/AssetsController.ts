import StreamController from "./StreamController";
import { AssetsCache } from "../types/assetCache";
import { Cache } from "@raycast/api";
import { StrippedAsset } from "../types/strippedAsset";
import AssetStream from "../connection/assets/AssetsStream";
import { StreamedIdentifier } from "@pieces.app/pieces-os-client";
import UserStream from "../connection/user/UserStream";

export default class AssetsController {
  private static instance: AssetsController;

  public readonly controller = new StreamController<AssetsCache>();

  private assets: AssetsCache;

  private cache = new Cache();

  private readonly CACHE_KEY = "assets-cache";

  private constructor() {
    const assetsCache = this.cache.get(this.CACHE_KEY) as string | null;

    this.assets = assetsCache
      ? JSON.parse(assetsCache)
      : { indicies: {}, assets: [] };

    this.controller.add(this.assets);

    AssetStream.getInstance(); // initialize the assets stream
    UserStream.getInstance(); // at some point we might want separate controller for it
  }

  /**
   * Retrieves the cached assets.
   *
   * @returns {AssetsCache} The cached assets.
   */
  getAssets(): AssetsCache {
    return this.assets;
  }

  /**
   * Retrieves an asset based on the provided asset string.
   *
   * @param {string} asset - The asset identifier.
   * @returns {any | null} - The asset if found, otherwise null.
   */
  get(asset: string) {
    const index = this.assets.indicies[asset];
    if (typeof index !== "number") return null;
    return this.assets.assets[this.assets.assets.length - index - 1];
  }

  /**
   * Sets multiple assets and adds them to the controller.
   *
   * @param {StrippedAsset[]} assets - An array of stripped assets to be set.
   */
  setMany(assets: StrippedAsset[]) {
    for (const asset of assets) {
      this.set(asset, false);
    }

    this.controller.add(this.assets);
  }

  /**
   * Sets an asset in the assets collection. If the asset already exists, it updates the existing asset.
   * Otherwise, it adds the new asset to the collection.
   *
   * @param {StrippedAsset} asset - The asset to be added or updated.
   * @param {boolean} [emit=true] - Whether to emit the updated assets to the controller.
   */
  set(asset: StrippedAsset, emit = true) {
    const index = this.assets.indicies[asset.id];
    if (typeof index !== "number") {
      this.assets.indicies[asset.id] = this.assets.assets.length;
      this.assets.assets.unshift(asset);
    } else {
      this.assets.assets[this.assets.assets.length - index - 1] = asset;
    }

    this.cache.set(this.CACHE_KEY, JSON.stringify(this.assets));
    if (emit) this.controller.add(this.assets);
  }

  /**
   * Deletes an asset from the assets list and updates the indices accordingly.
   *
   * @param {string} asset - The name of the asset to be deleted.
   */
  delete(asset: string) {
    const index = this.assets.indicies[asset];
    if (typeof index !== "number") return;

    delete this.assets.indicies[asset];

    for (const key of Object.keys(this.assets.indicies)) {
      const value = this.assets.indicies[key]!;
      if (value > index) {
        this.assets.indicies[key] = value - 1;
      }
    }

    this.assets.assets = this.assets.assets.splice(
      this.assets.assets.length - index - 1,
      1,
    );

    this.cache.set(this.CACHE_KEY, JSON.stringify(this.assets));
    this.controller.add(this.assets);
  }

  /**
   * This will clear up the cache of assets that do not exist
   * @param assets the assets we are sure exist at this
   */
  validate(assets: StreamedIdentifier[]) {
    const idMap: { [key: string]: boolean } = {};
    for (const asset of assets) {
      if (!asset.asset) throw new Error("not an asset!");
      idMap[asset.asset?.id] = true;
    }

    for (const key in this.assets.indicies) {
      if (!idMap[key]) {
        this.delete(key);
      }
    }
  }

  public static getInstance() {
    return (this.instance ??= new AssetsController());
  }
}
