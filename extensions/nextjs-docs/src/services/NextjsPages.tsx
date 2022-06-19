import { LocalStorage } from "@raycast/api";
import GithubOcto from "../Octokit";
import { TreeType, TopicType } from "../types/GithubType";
import path from "path";

/**
 * Make an api call to Github to fetch all documentation filenames.
 */
export async function getPagesFromGithub() {
  const octokit = new GithubOcto();
  const { data } = await octokit.request(
    "GET /repos/vercel/next.js/git/trees/86651d4c4f53e8a2882e22339fb78d0aa2879562",
    {
      recursive: true,
    }
  );

  if (!data || !data.tree) throw new Error("Please visit https://nextjs.org/");
  const results = data.tree
    .filter((file: TreeType) => file.type == "blob")
    .map((file: TopicType) => {
      const item: TopicType = {
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
      item.title = item.name
        .split("-")
        .join(" ")
        .replace(/(^\w{1})|(\s+\w{1})/g, (letter) => letter.toUpperCase());

      item.filepath = path.parse(file.path).dir;
      return item;
    });
  LocalStorage.setItem("topics", JSON.stringify(results));
  LocalStorage.setItem("updated_at", Date.now());
  return JSON.stringify(results);
}

/**
 * Get the topics from cache or make an api call
 * @returns Promise
 */
export async function getPagesFromCache(): Promise<string> {
  const topics: string | undefined = await LocalStorage.getItem("topics");
  return topics !== undefined ? topics : undefined;
}

/**
 * Fetch fresh data from Github is 24hours have been passed.
 * @returns Promise
 */
export async function checkForUpdates(): Promise<string | null> {
  const last_updated: string = await LocalStorage.getItem("updated_at");

  const last_updated_date = new Date(last_updated).setHours(0, 0, 0, 0);
  const today = new Date().setHours(0, 0, 0, 0);

  // If the data is older than 24hours, fetch it from Github
  if (last_updated === undefined || today > last_updated_date) {
    await getPagesFromGithub();
    return await getPagesFromCache();
  }

  return null;
}
