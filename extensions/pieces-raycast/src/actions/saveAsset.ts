import * as fs from "fs";
import * as path from "path";
import {
  AnchorTypeEnum,
  Asset,
  ClassificationSpecificEnum,
  Seed,
  SeedTypeEnum,
} from "@pieces.app/pieces-os-client";
import ConnectorSingleton from "../connection/ConnectorSingleton";
import Notifications from "../ui/Notifications";
import {
  Preferences,
  Toast,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import ContextService from "../connection/Context";
import { getClassificationSpecificEnum } from "../utils/converters/getClassificationSpecificEnum";
import isImage from "../utils/isImage";

/**
 * This will save an asset
 * - will respect the enrichment settings
 * - will show a toast showing the progress of saving
 * @param seed a seed to save to pieces
 * @returns
 */
export default async function saveAsset(seed: Seed) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Saving to Pieces",
  });

  const preferences = getPreferenceValues<Preferences>();

  seed.asset!.enrichment = {
    tags: Number(preferences),
    websites: Number(preferences),
    hints: Number(preferences),
    persons: Number(preferences),
  };

  return await ConnectorSingleton.getInstance()
    .assetsApi.assetsCreateNewAsset({
      seed,
    })
    .then((asset) => {
      toast.style = Toast.Style.Success;
      Notifications.getInstance().hudNotification(
        "Successfully saved to Pieces",
      );
      return asset;
    })
    .catch(async () => {
      Notifications.getInstance().serverErrorToast("save to Pieces");
      return null;
    });
}

/**
 * Saves a file to Pieces
 * @param file file uri in the format: file://{path}
 * @returns
 */
export async function saveFileToPieces(file: string): Promise<Asset | null> {
  const filePath = decodeURIComponent(file).replace("file://", ""); // remove the file:// prefix and decode the uri, i.e: replace %20 with a space

  if (!fs.existsSync(file)) {
    await Notifications.getInstance().errorToast(
      "Tried to save a file that does not exist!",
    );
    return null;
  }

  const extension = path.extname(filePath); // images are saved to the clipboard as a file without an extension, so if it doesn't have an extension we will assume it is an image.
  const classification = getClassificationSpecificEnum(extension);
  const fileContent = fs.readFileSync(filePath);

  if (extension && !isImage(classification)) {
    // this is a normal file
    return saveTextToPieces(fileContent.toString(), filePath);
  }

  // we are saving an image
  const application = await ContextService.getInstance().getApplication();
  if (!application) {
    await Notifications.getInstance().serverErrorToast("save to pieces");
    return null;
  }

  const seed: Seed = {
    type: SeedTypeEnum.SeededAsset,
    asset: {
      application,
      format: {
        file: {
          bytes: {
            raw: Array.from(fileContent),
          },
        },
      },
    },
  };

  return saveAsset(seed);
}

/**
 * Save some text to Pieces
 * @param text the text to save
 * @param file true if it's a file
 * @param ext the classification of the material
 * @returns
 */
export async function saveTextToPieces(
  text: string,
  file?: string,
  ext?: ClassificationSpecificEnum,
): Promise<Asset | null> {
  const application = await ContextService.getInstance().getApplication();
  if (!application) {
    await Notifications.getInstance().serverErrorToast("save to pieces");
    return null;
  }
  const seed: Seed = {
    type: SeedTypeEnum.SeededAsset,
    asset: {
      application,
      format: {
        [file ? "file" : "fragment"]: {
          string: {
            raw: text,
          },
          metadata: {
            ext,
          },
        },
      },
      metadata: {
        anchors: file ? [{ fullpath: file, type: AnchorTypeEnum.File }] : [],
      },
    },
  };
  return saveAsset(seed);
}
