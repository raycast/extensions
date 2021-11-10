import nodeFetch from "node-fetch";
const baseUrl = "https://api.are.na/v2";
const headers = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

export const api =
  (accessToken: string) =>
  async <T = unknown>(method: "GET" | "POST", resource: string, json?: any): Promise<T> => {
    const url = `${baseUrl}${resource}`;
    console.log(`${method} ${url}`);

    const res = await nodeFetch(url, {
      method,
      headers: {
        ...headers(accessToken),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(json),
    });
    console.log(`
    ${res.status}
    ${res.statusText}
  `);
    return await (res.json() as Promise<T>);
  };
