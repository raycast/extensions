import { Platform, Post, PostsPage, PostStatus } from "./types";

const API_URL = "https://api.publora.com/api/v1";

const headers = (token: string) => ({
  "Content-Type": "application/json",
  "x-publora-key": token,
  "x-publora-client": "raycast",
});

const parse = async <T,>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorData = (await response.json()) as { error?: string };
    throw new Error(`${errorData.error}`);
  }

  return response.json() as Promise<T>;
};

export const fetchPlatforms = async (token: string): Promise<Platform[]> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${API_URL}/platform-connections`, {
      headers: headers(token),
      signal: controller.signal,
    });
    const data = await parse<{ connections: Platform[] }>(response);

    return data.connections;
  } catch (error: unknown) {
    if (error && typeof error === "object" && (error as { name?: string }).name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const schedulePost = async (token: string, post: Post) => {
  const response = await fetch(`${API_URL}/create-post`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ ...post, scheduledTime: post.scheduledTime ?? undefined }),
  });

  return parse(response);
};

export const listPosts = async (
  token: string,
  options: { status?: PostStatus; page?: number; limit?: number } = {},
): Promise<PostsPage> => {
  const query = new URLSearchParams({
    page: `${options.page ?? 1}`,
    limit: `${options.limit ?? 20}`,
    sortBy: "updatedAt",
  });
  if (options.status) query.set("status", options.status);

  const response = await fetch(`${API_URL}/list-posts?${query}`, { headers: headers(token) });

  return parse<PostsPage>(response);
};

export const updatePost = async (token: string, postGroupId: string, post: Post) => {
  const { content, platforms, scheduledTime } = post;
  const response = await fetch(`${API_URL}/update-post/${postGroupId}`, {
    method: "PUT",
    headers: headers(token),
    body: JSON.stringify(
      scheduledTime
        ? { content, platforms, scheduledTime, status: "scheduled" }
        : { content, platforms, status: "draft" },
    ),
  });

  return parse(response);
};

export const deletePost = async (token: string, postGroupId: string) => {
  const response = await fetch(`${API_URL}/delete-post/${postGroupId}`, {
    method: "DELETE",
    headers: headers(token),
  });

  return parse(response);
};
