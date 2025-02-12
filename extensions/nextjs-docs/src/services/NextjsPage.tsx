import fs from "fs";
import path from "path";
import { LocalStorage, Toast, environment, showToast } from "@raycast/api";

import GithubOcto from "../Octokit";
import { TopicType } from "../types/GithubType";

const DATA_PATH = path.resolve(environment.supportPath, "data");

/**
 * Get the specified page from Github as raw file
 * @param topic|string
 */
async function getPageFromGithub(topic: TopicType): Promise<string> {
  await showToast(Toast.Style.Animated, "Fetching from GitHub");
  const octokit = new GithubOcto();

  const { data } = await octokit.request(`GET /repos/vercel/next.js/contents/docs/${topic.path}`, {
    headers: {
      accept: " application/vnd.github.v3.raw",
    },
  });

  if (!data) throw new Error("Please visit https://nextjs.org/");

  await writeToFile(topic.path, data);

  return data;
}

/**
 * Write the given content to the file.
 * @param fpath file path
 * @param content Contents of the file
 * @return
 */
async function writeToFile(fpath: string, content: string): Promise<void> {
  const filepath = path.resolve(DATA_PATH, fpath);
  const dir = path.dirname(filepath);

  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(path.dirname(filepath), { recursive: true });
    }

    fs.writeFileSync(filepath, content);
    await updateStorageItem(fpath);
  } catch (err) {
    await clearStorageItem(fpath);
    throw err;
  }
}

/**
 * Get a given topic from cache or make an api call to Github.
 * @param topic
 * @returns
 */
export async function getPageFromCache(topic: TopicType): Promise<string | undefined> {
  try {
    await showToast(Toast.Style.Animated, "Fetching from Cache");
    return fs.readFileSync(path.resolve(DATA_PATH, topic.path), "utf8");
  } catch (err) {
    clearStorageItem(topic.path);
    return undefined;
  }
}

/**
 * Check for updates in docs and update cache
 */
export async function checkForUpdates(topic: TopicType): Promise<string | null> {
  await showToast(Toast.Style.Animated, "Checking for Updates");
  const last_updated: string | undefined = await getStorageItem(topic.path);
  const last_updated_date = new Date(last_updated || "").setHours(0, 0, 0, 0);
  const today = new Date().setHours(0, 0, 0, 0);

  // If the data is older than 24hours, fetch it from Github
  if (last_updated === undefined || today > last_updated_date) {
    return await getPageFromGithub(topic);
  }

  return null;
}

/**
 * Remove the value for the given key from the local storage.
 */
async function clearStorageItem(key: string) {
  await LocalStorage.removeItem(`${key}_updated_at`);
}

/**
 * Update the value for the given key from the local storage.
 */
async function updateStorageItem(key: string): Promise<void> {
  await LocalStorage.setItem(`${key}_updated_at`, Date.now());
}

/**
 * Get the value for the given key from the local storage.
 */
async function getStorageItem(key: string): Promise<string | undefined> {
  return LocalStorage.getItem<string>(`${key}_updated_at`);
}
