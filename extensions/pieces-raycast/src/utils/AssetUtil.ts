import * as utf8 from "utf8";
import {
  Asset,
  Format,
  Classification,
  ClassificationGenericEnum,
} from "@pieces.app/pieces-os-client";
import { Nullable } from "../types/nullable";
import { StrippedAsset } from "../types/strippedAsset";

export default class AssetUtil {
  static getOcrContent(src: Asset): Nullable<string> {
    const format = AssetUtil.getOcrFormat(src);
    if (!format) return null;

    return AssetUtil.ocrFromFormat(format);
  }

  static getOcrFormat(src: Asset): Format | undefined {
    const imageId = src?.original.reference?.analysis?.image?.ocr?.raw.id;
    if (!imageId) return undefined;

    return src.formats.iterable?.find((element) => element.id === imageId);
  }

  /**
   * Only works with formats that are confirmed to be OCR formats.
   * @param src
   */
  static ocrFromFormat(src?: Format): Nullable<string> {
    if (!src) return null;
    try {
      return utf8.decode(String.fromCharCode(...src.file!.bytes!.raw!));
    } catch (err) {
      console.log("Error in getting image code.", err);
      return null;
    }
  }

  static classification(asset: Asset): Classification {
    if (asset.original.reference?.analysis?.image?.ocr?.id) {
      const ocrFormat = this.getOcrFormat(asset);
      if (ocrFormat) return ocrFormat?.classification;
    }
    return asset?.original.reference!.classification;
  }

  static isImage(src: Asset): boolean {
    return (
      src.original.reference?.classification.generic ===
      ClassificationGenericEnum.Image
    );
  }

  static rawContent(asset: Asset) {
    return (
      asset?.original.reference?.fragment?.string?.raw ??
      asset?.preview.base.reference?.fragment?.string?.raw ??
      ""
    );
  }

  static imageBytes(asset: Asset) {
    return asset?.original.reference?.file?.bytes?.raw;
  }

  static getStringFormats(asset: Asset) {
    return asset?.formats.iterable?.filter(AssetUtil.isText) ?? [];
  }

  static isText(assetOrFormat: Asset | Format) {
    const textTypes: Array<ClassificationGenericEnum> = [
      ClassificationGenericEnum.Code,
      ClassificationGenericEnum.Text,
    ];
    if ("asset" in assetOrFormat)
      // means we got format
      return textTypes.includes(assetOrFormat.classification.generic);
    return textTypes.includes(AssetUtil.classification(assetOrFormat).generic);
  }

  static stripAsset(asset: Asset): StrippedAsset {
    return {
      id: asset.id,
      text: AssetUtil.isImage(asset)
        ? AssetUtil.getOcrContent(asset) ?? "Unable to get asset content"
        : AssetUtil.rawContent(asset),
      ext: AssetUtil.classification(asset).specific,
      tags: asset.tags?.iterable.map((el) => {
        return { text: el.text };
      }),
      websites: asset.websites?.iterable.map((el) => {
        return { url: el.url, name: el.name };
      }),
      name: asset.name,
      annotations: asset.annotations?.iterable.map((el) => {
        return {
          text: el.text,
          type: el.type,
        };
      }),
    };
  }
}
