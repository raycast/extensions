import { LocalStorage } from "@raycast/api";
import GithubOcto from "../Octokit";
import { Tree, Topic } from "../types/GithubType";
import path from "path";
import fs from "fs";

const data_path = __dirname + "/data";

/**
 * Make an api call to Github to fetch all documentation filenames.
 */
async function getTopicsFromGithub() {
  const octokit = new GithubOcto();
  const { data } = await octokit.request(
    "GET /repos/vercel/next.js/git/trees/86651d4c4f53e8a2882e22339fb78d0aa2879562",
    {
      recursive: true,
    }
  );

  if (!data || !data.tree) throw new Error("Please visit https://nextjs.org/");

  const results = data.tree
    .filter((file: Tree) => file.type == "blob")
    .map((file: Topic) => {
      const item: Topic = {
        type: "",
        path: "",
        sha: "",
        name: "",
        title: "",
        filepath: "",
      };
      item.type = file.type;
      item.path = file.path;
      item.sha = file.sha;

      item.name = path.parse(file.path).name;

      const finalTitle = item.name
        .split("-")
        .join(" ")
        .replace(/(^\w{1})|(\s+\w{1})/g, (letter) => letter.toUpperCase());
      item.title = finalTitle;

      item.filepath = path.parse(file.path).dir;
      return item;
    });
  LocalStorage.setItem("topics", JSON.stringify(results));
  LocalStorage.setItem("updated_at", Date.now());
}

/**
 * Get the topics from cache or make an api call
 * @returns Promise
 */
export async function getTopicsFromCache(): Promise<string> {
  const last_updated: string = await LocalStorage.getItem("updated_at");

  const last_updated_date = new Date(last_updated).setHours(0, 0, 0, 0);
  const today = new Date().setHours(0, 0, 0, 0);

  // If the data is older than 24hours, fetch it from Github
  if (last_updated === undefined || today > last_updated_date) {
    await getTopicsFromGithub();
  }

  const topics: string = (await LocalStorage.getItem("topics")) || "";
  if (!topics) throw new Error("Cached results not loaded!");
  return topics;
}

/**
 * Make an api call to fetch the markdown content from Github
 * @param topic
 */
async function getTopicFromGithub(topic: Topic) {
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
function readFromFile(name: string) {
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
export async function getTopicFromCache(topic: Topic): Promise<string> {
  const data_folder = createDataFolder();
  if (!data_folder) throw new Error("Failed to create folder!");

  const last_updated: string = await LocalStorage.getItem(`${topic.name}_updated_at`);
  const last_updated_date = new Date(last_updated).setHours(0, 0, 0, 0);
  const today = new Date().setHours(0, 0, 0, 0);

  // If the data is older than 24hours, fetch it from Github
  if (last_updated === undefined || today > last_updated_date) {
    await getTopicFromGithub(topic);
  }

  const topicData: string = readFromFile(topic.name);
  if (!topicData) throw new Error("Cached results not loaded!");
  return topicData;
}

/**
 * Remove the value for the given key from the local storage.
 * @param key
 */
async function clearStorageItem(key: string) {
  await LocalStorage.removeItem(key);
}
