import { Platform, Post } from "./types";

export const fetchPlatforms = async (api_key: string): Promise<Platform[]> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    const response = await fetch("https://api.publora.com/api/v1/platform-connections", {
      headers: {
        "x-publora-key": `${api_key}`,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`${errorData.error}`);
    }

    const data = await response.json();

    return data.connections as Platform[];
  } catch (error: unknown) {
    if (error && typeof error === "object" && (error as { name?: string }).name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
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
