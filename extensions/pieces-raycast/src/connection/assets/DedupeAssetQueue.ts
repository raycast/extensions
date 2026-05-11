import AssetsController from "../../controllers/AssetsController";
import fetchAsset from "./fetchAsset";

/**
 * This class, as named, is a deduped asset fetching queue
 *   - this type of implementation is required as we may get many update events
 *     for the same asset in a short amount of time, resulting in many duplicate requests
 */
export default class DedupeAssetQueue {
  private static instance: DedupeAssetQueue;

  private dedupe = new Set<string>();

  private queue: string[] = [];

  private fetching = false;

  private readonly BATCH_SIZE = 5;

  private constructor() {
    /* */
  }

  /**
   * This is the entry point to our asset fetch queue
   * @param ids asset id or asset ids to add to the queue
   * @returns void
   */
  public push(ids: string | string[]) {
    if (typeof ids === "string") {
      if (this.dedupe.has(ids)) return;
      this.dedupe.add(ids);
      this.queue.push(ids);
    } else {
      if (!ids.length) return;
      for (const id of ids) {
        if (this.dedupe.has(id)) continue;
        this.dedupe.add(id);
        this.queue.push(id);
      }
    }
    this.fetch();
  }

  /**
   * Fetch the assets in the queue in batches
   * @returns void
   */
  private async fetch() {
    if (this.fetching) return;
    this.fetching = true;

    let batch: string[];

    while ((batch = this.queue.splice(0, this.BATCH_SIZE)).length) {
      for (const id of batch) {
        this.dedupe.delete(id);
      }

      const assets = await Promise.all(batch.map((el) => fetchAsset(el)));

      AssetsController.getInstance().setMany(assets);
    }

    this.fetching = false;
  }

  public static getInstance() {
    return (this.instance ??= new DedupeAssetQueue());
  }
}
