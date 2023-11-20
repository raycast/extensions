import { request } from "@octokit/request";
import fetch from "cross-fetch";
import { DEFAULT_REGISTRY_SOURCES, GIST_ID, GIST_TOKEN, IRegistrySourceItem } from "./constants";

export const getRegistrySources = async () => {
  let content: string = "";

  try {
    const { data } = await request(`GET /gists/${GIST_ID}`, {
      gist_id: GIST_ID,
      headers: {
        accept: "application/vnd.github+json",
        authorization: `token ${GIST_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      request: {
        fetch,
      },
    });

    content = data?.files?.["register.json"]?.content || "";

    if (content) {
      return JSON.parse(content.trim()) as IRegistrySourceItem[];
    }

    return DEFAULT_REGISTRY_SOURCES;
  } catch (ex) {
    console.error(ex, content);

    return DEFAULT_REGISTRY_SOURCES;
  }
};
