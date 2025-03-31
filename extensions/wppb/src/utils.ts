import { environment } from "@raycast/api";
import { readdirSync, rename, statSync, writeFile, existsSync, promises as fsPromises } from "fs";
import path from "path";
import fetch from "node-fetch";
import extract from "extract-zip";
import { repoName } from "./constants";
import { FormValues } from "./types";

// Utility functions to replicate PHP string functions
const lcfirst = (str: string): string => str.charAt(0).toLowerCase() + str.slice(1);

const str_replace = (search: string, replace: string, subject: string): string => subject.split(search).join(replace);

const ucwords = (str: string, delimiter: string): string =>
  str
    .split(delimiter)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(delimiter);

const replaceContent = (content: string, values: FormValues): string => {
  const { pluginSlug, authorURL, pluginURL, pluginName, pluginDescription, authorName, authorEmail } = values;
  const replacements: { [key: string]: string } = {
    "http://example.com/plugin-name-uri/": pluginURL,
    "WordPress Plugin Boilerplate": pluginName,
    "This is a short description of what the plugin does. It's displayed in the WordPress admin area.":
      pluginDescription,
    "Your Name or Your Company": authorName,
    "http://example.com": authorURL,
    "plugin-name": pluginSlug,
    "Your Name <email@example.com>": `${authorName} <${authorEmail}>`,
    Plugin_Name: str_replace("-", "_", ucwords(pluginSlug, "-")),
    PLUGIN_NAME_VERSION: `${str_replace("-", "_", pluginSlug.toUpperCase())}_VERSION`,
  };

  let updatedContent = content;
  for (const [search, replace] of Object.entries(replacements)) {
    updatedContent = updatedContent.replace(new RegExp(search, "g"), replace);
  }
  updatedContent = updatedContent.replace(/plugin_name/g, lcfirst(str_replace("-", "", ucwords(pluginSlug, "-"))));

  return updatedContent;
};

export const downloadZip = async (url: string) => {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const zipFilePath = `${environment.supportPath}/master.zip`;
  return new Promise<string>((resolve, reject) => {
    writeFile(zipFilePath, buffer, (err) => {
      if (err) {
        console.error("Error writing file:", err);
        reject(err);
      } else {
        console.log("File saved successfully to:", zipFilePath);
        resolve(zipFilePath);
      }
    });
  });
};
export const findPluginNameDirectory = async (basePath: string): Promise<string | null> => {
  const items = readdirSync(basePath); // Use async readdir
  for (const item of items) {
    const itemPath = path.join(basePath, item);
    const statResult = statSync(itemPath); // Use async stat
    if (statResult.isDirectory() && item === "plugin-name") {
      return itemPath;
    }
  }
  return null;
};

export const findFilesReplace = async (basePath: string, values: FormValues): Promise<string[]> => {
  const { pluginSlug } = values;
  let results: string[] = [];
  const items = await fsPromises.readdir(basePath); // Use async readdir

  const renameAndProcessFile = async (itemPath: string, item: string) => {
    const newName = item.replace("plugin-name", pluginSlug);
    const newPath = path.join(basePath, newName);
    await fsPromises.rename(itemPath, newPath);

    try {
      const content = await fsPromises.readFile(newPath, "utf-8");
      const updatedContent = replaceContent(content, values);
      await fsPromises.writeFile(newPath, updatedContent);
      results.push(newPath);
    } catch (error) {
      console.error(`Error reading file: ${newPath}`, error);
    }
  };

  const filePromises = items.map(async (item) => {
    const itemPath = path.join(basePath, item);
    const stat = await fsPromises.stat(itemPath);

    if (stat.isDirectory()) {
      results = results.concat(await findFilesReplace(itemPath, values));
    } else {
      await renameAndProcessFile(itemPath, item);
    }
  });

  await Promise.all(filePromises);
  return results;
};

export async function moveDirectory(source: string, destination: string): Promise<void> {
  // Check if the source directory exists
  if (!existsSync(source)) {
    throw new Error(`Source directory does not exist: ${source}`);
  }

  const destPath = path.join(destination, path.basename(source));
  await fsPromises.rename(source, destPath); // Use fsPromises for async rename
}

export const extractZip = async (zipFilePath: string) => {
  const extractPath = `${environment.supportPath}/`;
  await extract(zipFilePath, { dir: extractPath });
  return `${extractPath}/${repoName}`;
};

export const renameDirectory = async (dirPath: string, pluginSlug: string) => {
  return new Promise<string>((resolve, reject) => {
    const renamePath = `${environment.supportPath}/${repoName}/${pluginSlug}`;
    rename(dirPath, renamePath, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(renamePath);
      }
    });
  });
};

// Placeholder function to delete files in a directory
async function deleteFilesInDirectory(directory: string) {
  const files = await fsPromises.readdir(directory);
  for (const file of files) {
    const filePath = path.join(directory, file);
    const stat = await fsPromises.stat(filePath);
    if (stat.isFile()) {
      await fsPromises.unlink(filePath); // Delete the file
    } else if (stat.isDirectory()) {
      await deleteFilesInDirectory(filePath); // Recursively delete files in subdirectory
      await fsPromises.rmdir(filePath); // Remove the directory after its contents are deleted
    }
  }
}

export async function cleanSupportPath() {
  try {
    await deleteFilesInDirectory(environment.supportPath);
  } catch (error) {
    console.error("Failed to clean support path:", error);
  }
}

export const directoryExists = async (values: FormValues): Promise<boolean> => {
  try {
    const stats = await fsPromises.stat(`${values.outputDirectory[0]}/${values.pluginSlug}`);
    return stats.isDirectory();
  } catch {
    return false;
  }
};

export const validateUrl = (value: string): string | undefined => {
  if (!value) {
    return "The item is required.";
  }
  try {
    new URL(value);
  } catch {
    return "Invalid URL format.";
  }
};

// Function to validate an email address
export const validateEmail = (email: string): string | undefined => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!email) {
    return "The email is required.";
  }
  if (!emailRegex.test(email)) {
    return "Invalid email format.";
  }
};
