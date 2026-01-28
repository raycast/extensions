import { LocalStorage, showToast, Toast } from "@raycast/api";
import GithubOcto from "../Octokit";
import { TreeType, TopicType } from "../types/GithubType";
import path from "path";

// Last Updated: 2026-01-13
const TREE_SHA = "782cf20ba81055f4ffbee45a1346245dc69d3b9c";

/**
 * Make an api call to Github to fetch all documentation filenames.
 */
export async function getPagesFromGithub() {
  await showToast(Toast.Style.Animated, "Fetching from GitHub");
  const octokit = new GithubOcto();
  const { data } = await octokit.request(`GET /repos/vercel/next.js/git/trees/${TREE_SHA}`, {
    recursive: true,
  });

  if (!data || !data.tree) throw new Error("Please visit https://nextjs.org/");
  const results = data.tree
    .filter((file: TreeType) => file.type == "blob")
    .map((file: TreeType) => {
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

      const filepath = path.parse(file.path);
      item.name = filepath.name;
      item.title = item.name
        .split("-")
        .join(" ")
        .replace(/(^\w{1})|(\s+\w{1})/g, (letter) => letter.toUpperCase());

      item.filepath = `${filepath.dir}/${filepath.name}`;
      item.filepath = item.filepath
        .split("/")
        .map((doc) => doc.slice(doc.indexOf("-") + 1))
        .join("/")
        .replace(".mdx", "");
      return item;
    });
  await LocalStorage.setItem("topics", JSON.stringify(results));
  await LocalStorage.setItem("updated_at", Date.now());
  await LocalStorage.setItem("current_sha", TREE_SHA);
  return JSON.stringify(results);
}

/**
 * Get the topics from cache or make an api call
 * @returns Promise
 */
export async function getPagesFromCache(): Promise<string | undefined> {
  await showToast(Toast.Style.Animated, "Fetching from Cache");
  const topics: string | undefined = await LocalStorage.getItem("topics");
  return topics;
}

/**
 * Fetch fresh data from Github is 24hours have been passed.
 * @returns Promise
 */
export async function checkForUpdates(): Promise<string | undefined> {
  await showToast(Toast.Style.Animated, "Checking for Updates");
  const last_updated: string | undefined = await LocalStorage.getItem("updated_at");

  const last_updated_date = new Date(last_updated || "").setHours(0, 0, 0, 0);
  const today = new Date().setHours(0, 0, 0, 0);
  const current_sha = await LocalStorage.getItem<string>("current_sha");

  // If the data is older than 24hours, fetch it from Github
  //  OR if the SHA is different i.e. SHA was updated but extension is using old SHA
  if (last_updated === undefined || today > last_updated_date || current_sha !== TREE_SHA) {
    await getPagesFromGithub();
    return await getPagesFromCache();
  }

  return undefined;
}
