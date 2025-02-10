import { LocalStorage, environment } from "@raycast/api";
import * as fs from "fs";
import { defaultCommands } from "../../data/default-commands";
import { Extension, ExtensionCommand } from "../common/types";
import { AudioData, ImageData } from "../scripts/types";
import { CommandOptions } from "../commands/types";
import { defaultModels } from "../../data/default-models";
import { randomUUID } from "crypto";
import path from "path";
import { ADVANCED_SETTINGS_FILENAME, CUSTOM_PLACEHOLDERS_FILENAME } from "../common/constants";
import { defaultCustomPlaceholders } from "../../data/default-custom-placeholders";
import { ScriptRunner } from "../scripts";
import exifr from "exifr";
import { filterString } from "../context-utils";
import { defaultAdvancedSettings } from "../../data/default-advanced-settings";
import { exec } from "child_process";
import * as os from "os";

/**
 * Installs the default prompts if they haven't been installed yet and the user hasn't input their own command set.
 *
 * @returns A promise to a void result
 */
export async function installDefaults() {
  const defaultsItem = await LocalStorage.getItem("--defaults-installed");
  if (!defaultsItem) {
    const numItems = Object.keys(await LocalStorage.allItems()).length;
    if (numItems > 0) {
      return;
    }

    // Load default commands
    for (const [key, value] of Object.entries(defaultCommands)) {
      await LocalStorage.setItem(key, JSON.stringify(value));
    }

    // Load default models
    for (const [key, value] of Object.entries(defaultModels)) {
      await LocalStorage.setItem(key, JSON.stringify({ ...value, id: randomUUID() }));
    }

    // Set up data files
    const customPlaceholdersPath = path.join(environment.supportPath, CUSTOM_PLACEHOLDERS_FILENAME);
    if (!fs.existsSync(customPlaceholdersPath)) {
      await fs.promises.writeFile(customPlaceholdersPath, JSON.stringify(defaultCustomPlaceholders, null, 2));
    }

    const advancedSettingsPath = path.join(environment.supportPath, ADVANCED_SETTINGS_FILENAME);
    if (!fs.existsSync(advancedSettingsPath)) {
      await fs.promises.writeFile(advancedSettingsPath, JSON.stringify(defaultAdvancedSettings, null, 2));
    }

    await LocalStorage.setItem("--defaults-installed", "true");
  }
}

/**
 * Obtains EXIF data for an image file.
 *
 * @param filePath The path to the image file.
 * @returns The EXIF data as a string.
 */
export const getFileExifData = async (filePath: string) => {
  /* Gets the EXIF data and metadata of an image file. */
  const exifData = await exifr.parse(filePath);
  const metadata = fs.statSync(filePath);
  return JSON.stringify({ ...exifData, ...metadata });
};

/**
 * Obtains a description of an image by using computer vision and EXIF data.
 *
 * @param filePath The path of the image file.
 * @param options A {@link CommandOptions} object describing the types of information to include in the output.
 * @returns The image description as a string.
 */
export const getImageDetails = async (filePath: string, options: CommandOptions): Promise<ImageData> => {
  const imageDetails = await ScriptRunner.ImageFeatureExtractor(
    filePath,
    options.useSubjectClassification || false,
    options.useBarcodeDetection || false,
    options.useFaceDetection || false,
    options.useRectangleDetection || false,
    options.useSaliencyAnalysis || false,
    options.useHorizonDetection || false,
  );
  const imageVisionInstructions = filterString(imageDetails.stringValue);
  const exifData =
    options.useMetadata && !filePath.endsWith(".svg") ? filterString(await getFileExifData(filePath)) : ``;
  const exifInstruction = options.useMetadata ? `<EXIF data: ###${exifData}###>` : ``;
  return {
    ...imageDetails,
    imageEXIFData: exifInstruction,
    stringValue: `${imageVisionInstructions}${exifInstruction}`,
  };
};

/**
 * Gets the metadata and sound classifications of an audio file.
 *
 * @param filePath The path of the audio file.
 * @param useMetadata Whether to include metadata in the output.
 *
 * @returns The metadata and sound classifications as a single string.
 */
export const getAudioDetails = async (filePath: string): Promise<AudioData> => {
  const soundClassifications = filterString((await ScriptRunner.SoundClassifier(filePath)).replace("_", " ")).trim();
  const classificationInstructions = `<Sound classifications: "${soundClassifications}".>`;
  return {
    stringValue: `${soundClassifications ? `\n${classificationInstructions}` : ""}`,
    soundClassifications: soundClassifications,
  };
};

/**
 * Gets the list of extensions installed in Raycast.
 * @returns The list of extensions as an array of {@link Extension} objects.
 */
export const getExtensions = async (): Promise<Extension[]> => {
  return new Promise((resolve, reject) => {
    const extensionsDir = environment.assetsPath.split("/").slice(0, -2).join("/");
    fs.readdir(extensionsDir, (err, files) => {
      const extensions: Extension[] = [];
      if (err) {
        console.error(err);
        reject(err);
      }

      files
        .filter((file) => !file.startsWith("."))
        .forEach((file) => {
          const extensionPath = `${extensionsDir}/${file}`;
          const packagePath = `${extensionPath}/package.json`;
          if (fs.existsSync(packagePath)) {
            const extension: Extension = {
              title: "",
              name: "",
              path: extensionPath,
              author: "",
              description: "",
              commands: [],
            };

            const content = fs.readFileSync(packagePath).toString();
            const packageJSON = JSON.parse(content);

            if (packageJSON.title) {
              extension.title = packageJSON.title;
            }

            if (packageJSON.author) {
              extension.author = packageJSON.author;
            }

            if (packageJSON.description) {
              extension.description = packageJSON.description;
            }

            if (packageJSON.author) {
              extension.author = packageJSON.author;
            }

            if (packageJSON.commands) {
              packageJSON.commands.forEach((entry: { [key: string]: string }) => {
                const command: ExtensionCommand = {
                  title: "",
                  name: "",
                  description: "",
                  deeplink: "",
                };

                if (entry.title) {
                  command.title = entry.title;
                }

                if (entry.name) {
                  command.name = entry.name;
                }

                if (entry.description) {
                  command.description = entry.description;
                }

                if (packageJSON.name && packageJSON.author && entry.name) {
                  command.deeplink = `raycast://extensions/${packageJSON.author}/${packageJSON.name}/${entry.name}`;
                }

                extension.commands.push(command);
              });
            }

            extensions.push(extension);
          }
        });
      resolve(extensions);
    });
  });
};

/**
 * Unzips a compressed file to a temporary directory.
 * @param zipPath The path of the compressed file.
 * @returns The path of the temporary directory.
 */
export const unzipToTemp = async (zipPath: string) => {
  const dirPath = path.join(os.tmpdir(), `${path.basename(zipPath, ".zip")}`);
  if (fs.existsSync(dirPath)) {
    await fs.promises.rm(dirPath, { recursive: true });
  }

  try {
    // Unzip the file
    await new Promise((resolve) => {
      exec(`unzip "${zipPath}" -d "${dirPath}"`, (err) => {
        if (err) console.error(err);
      }).on("exit", async () => {
        resolve(true);
      });
    });

    // Remove the zip file
    await new Promise((resolve) => {
      exec(`rm "${zipPath}"`, (err) => {
        if (err) console.error(err);
      }).on("exit", async () => {
        resolve(true);
      });
    });
    return dirPath;
  } catch (e) {
    console.error(e);
    return null;
  }
};
