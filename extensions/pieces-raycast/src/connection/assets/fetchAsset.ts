import { Annotation, Asset, Tag, Website } from "@pieces.app/pieces-os-client";
import { StrippedAsset } from "../../types/strippedAsset";
import AssetUtil from "../../utils/AssetUtil";
import ConnectorSingleton from "../ConnectorSingleton";

/**
 * This will fetch an asset given its id
 * - will join with formats, websites, tags, and annotations
 * @param id the id to fetch
 * @returns a stripped asset
 */
export default async function fetchAsset(id: string): Promise<StrippedAsset> {
  const asset = await ConnectorSingleton.getInstance().assetApi.assetSnapshot({
    asset: id,
    transferables: false,
  });

  await Promise.all([
    fetchFormats(asset),
    fetchItems(asset, "annotations", (id) =>
      ConnectorSingleton.getInstance().annotationApi.annotationSpecificAnnotationSnapshot(
        { annotation: id },
      ),
    ),
    fetchItems(asset, "tags", (id) =>
      ConnectorSingleton.getInstance().tagApi.tagsSpecificTagSnapshot({
        tag: id,
      }),
    ),
    fetchItems(asset, "websites", (id) =>
      ConnectorSingleton.getInstance().websiteApi.websitesSpecificWebsiteSnapshot(
        { website: id },
      ),
    ),
  ]);

  return AssetUtil.stripAsset(asset);
}

type KeyToIterableType<T extends "tags" | "annotations" | "websites"> =
  T extends "tags" ? Tag : T extends "annotations" ? Annotation : Website;
/**
 * This will fetch a collection on an asset and merge the result onto it
 * @param asset the asset to join with
 * @param key the type of collection we are fetching
 * @param apiCall api call that returns the collection item given the id
 * @returns the asset with the new metadata joined to it
 */
async function fetchItems<T extends "tags" | "annotations" | "websites">(
  asset: Asset,
  key: T,
  apiCall: (id: string) => Promise<KeyToIterableType<T>>,
) {
  if (!asset[key]) return;

  const promises = new Array<Promise<KeyToIterableType<T>>>();
  for (const item in asset[key]?.indices ?? {}) {
    let retries = 0;
    if (asset[key]?.indices?.[item] !== -1)
      promises.push(
        apiCall(item).catch(async () => {
          if (retries > 5) return Promise.reject();
          retries++;
          await new Promise((res) =>
            setTimeout(res, Math.random() * 200 * retries),
          );
          return apiCall(item);
        }),
      );
  }

  (asset[key] as { iterable: KeyToIterableType<T>[] }).iterable =
    await Promise.all(promises);
}

/**
 * This will attach the transferable onto the asset
 * @param asset the asset to attach data to
 */
async function fetchFormats(asset: Asset) {
  const formats = await Promise.all([
    ConnectorSingleton.getInstance().formatApi.formatSnapshot({
      format: asset.original.reference?.analysis?.image?.ocr?.raw.id
        ? asset.original.reference.analysis.image.ocr.raw.id
        : asset.original.reference?.id ?? asset.original.id,
      transferable: true,
    }),
    ConnectorSingleton.getInstance().formatApi.formatSnapshot({
      format: asset.preview.base.id,
      transferable: true,
    }),
  ]);
  if (asset.original.reference) {
    asset.original.reference.file = formats[0].file;
    asset.original.reference.fragment = formats[0].fragment;
  }
  if (asset.preview.base.reference) {
    asset.preview.base.reference.file = formats[1].file;
    asset.preview.base.reference.fragment = formats[1].fragment;
  }
}
