import fetch from "node-fetch";

const base64encode = (str: string) => {
  return Buffer.from(str).toString("base64");
};

const getAuthHeader = (token: string) => {
  return {
    Authorization: `Basic ${base64encode(`${token}:api_token`)}`,
  };
};

export const authenticatedFetch = (token: string, baseUrl: string) => ({
  get: async <T>(endpoint: string): Promise<T> => {
    const response = await fetch(baseUrl + endpoint, {
      headers: getAuthHeader(token),
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return (await response.json()) as T;
  },
  post: async <T>(endpoint: string, body: unknown): Promise<T> => {
    const response = await fetch(baseUrl + endpoint, {
      method: "POST",
      headers: {
        ...getAuthHeader(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}, ${await response.text()}`);
    }
    return (await response.json()) as T;
  },
  patch: async <T>(endpoint: string, body: unknown): Promise<T> => {
    const response = await fetch(baseUrl + endpoint, {
      method: "PATCH",
      headers: {
        ...getAuthHeader(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}, ${await response.text()}`);
    }
    return (await response.json()) as T;
  },
});
