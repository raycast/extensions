import { Platform, Post } from "./types";

export const fetchPlatforms = async (api_key: string): Promise<Platform[]> => {
  const response = await fetch("https://api.publora.com/api/v1/platform-connections", {
    headers: {
      "x-publora-key": `${api_key}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`${errorData.error}`);
  }

  const data = await response.json();

  return data.connections as Platform[];
};

export const schedulePost = async (api_key: string, post: Post) => {
  const body = JSON.stringify(post);
  const response = await fetch("https://api.publora.com/api/v1/create-post", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-publora-key": `${api_key}`,
    },
    body: body,
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`${errorData.error}`);
  }

  return response.json();
};
