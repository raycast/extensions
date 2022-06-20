import { LocalStorage } from "@raycast/api";
import GithubOcto from "../Octokit";
import { TopicType } from "../types/GithubType";
import fs from "fs";

const data_path = __dirname + "/data";

/**
 * Get the specified page from Github as raw file
 * @param topic|string
 */
async function getPageFromGithub(topic: TopicType) {
  const octokit = new GithubOcto();

  const { data } = await octokit.request(`GET /repos/vercel/next.js/contents/docs/${topic.path}`, {
    headers: {
      accept: " application/vnd.github.v3.raw",
    },
  });

  if (!data) throw new Error("Please visit https://nextjs.org/");

  const isWritten = writeToFile(topic.name, data);
  if (!isWritten) throw new Error("Failed to write to file!");
  LocalStorage.setItem(`${topic.name}_updated_at`, Date.now());
}

/**
 * Create or sync the data folder.
 * @returns boolean
 */
const createDataFolder = () => {
  try {
    if (!fs.existsSync(data_path)) {
      fs.mkdirSync(data_path);
    }
    return true;
  } catch (err) {
    throw new Error("Failed to create data folder!");
  }
};

/**
 * Write the given content to the file.
 * @param name Filename
 * @param content Contents of the file
 * @returns
 */
function writeToFile(name: string, content: string) {
  try {
    fs.writeFileSync(`${data_path}/${name}.md`, content);
    return true;
  } catch (err) {
    clearStorageItem(`${name}_updated_at`);
    throw new Error("Failed to write to file!");
  }
}

/**
 * Read contents of the file.
 * @param name Filename
 * @returns
 */
async function readFromFile(name: string) {
  try {
    const data = fs.readFileSync(`${data_path}/${name}.md`, "utf8");
    return data;
  } catch (err) {
    clearStorageItem(`${name}_updated_at`);
    throw new Error("Failed to read from file!");
  }
}

/**
 * Get a given topic from cache or make an api call to Github.
 * @param topic
 * @returns
 */
export async function getPageFromCache(topic: TopicType): Promise<string> {
  const topicData: string = await readFromFile(topic.name);
  if (!topicData) {
    throw new Error("Cached results not loaded!");
  }
  return topicData;
}

/**
 * Check for updates in docs and update cache
 */
export async function checkForUpdates(topic: TopicType): Promise<string | null> {
  const data_folder = createDataFolder();
  if (!data_folder) throw new Error("Failed to create folder!");

  const last_updated: string = await LocalStorage.getItem(`${topic.name}_updated_at`);
  const last_updated_date = new Date(last_updated).setHours(0, 0, 0, 0);
  const today = new Date().setHours(0, 0, 0, 0);

  // If the data is older than 24hours, fetch it from Github
  if (last_updated === undefined || today > last_updated_date) {
    await getPageFromGithub(topic);
    return await getPageFromCache(topic);
  }

  return null;
}

/**
 * Remove the value for the given key from the local storage.
 * @param key
 */
async function clearStorageItem(key: string) {
  await LocalStorage.removeItem(key);
}
