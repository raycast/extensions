import https from "https";
import { URL } from "url";
import { LocalStorage } from "@raycast/api";

async function getApiConfig() {
  const host = await LocalStorage.getItem<string>("host");
  const token = await LocalStorage.getItem<string>("token");
  if (!host || !token) {
    throw new Error("API configuration is not initialized");
  }
  return { host, token };
}

interface ExtendedRequestOptions extends https.RequestOptions {
  body?: unknown;
}

async function fetchWithAuth(path: string, options: ExtendedRequestOptions = {}): Promise<unknown> {
  const { host, token } = await getApiConfig();
  const url = new URL(path, host);
  return new Promise((resolve, reject) => {
    const requestOptions: https.RequestOptions = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: options.method || "GET",
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        "User-Agent": "Raycast Extension",
      },
    };

    const req = https.request(requestOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP error! status: ${res.statusCode}, body: ${data}`));
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    if (options.body) {
      const bodyData = JSON.stringify(options.body);
      req.write(bodyData);
    }

    req.end();
  });
}

export async function fetchLinks(cursor?: string) {
  const path = cursor ? `/api/link/list?cursor=${cursor}&limit=500` : "/api/link/list";
  return fetchWithAuth(path);
}

export async function fetchLinkBySlug(slug: string) {
  try {
    return await fetchWithAuth(`/api/link/query?slug=${slug}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      return null;
    }
    throw error;
  }
}

export async function createLink(url: string, slug?: string, comment?: string) {
  return fetchWithAuth("/api/link/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: { url, slug, comment },
  });
}

export async function queryLink(slug: string) {
  return fetchLinkBySlug(slug);
}

export async function checkTokenValid(host: string, token: string): Promise<boolean> {
  const url = new URL("/api/link/list?limit=1", host);

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode === 200) {
            try {
              const response = JSON.parse(data);
              resolve("cursor" in response);
            } catch {
              resolve(false);
            }
          } else {
            resolve(false);
          }
        });
      },
    );

    req.on("error", () => {
      resolve(false);
    });

    req.end();
  });
}

export function setApiConfig(config: { host: string; token: string }) {
  LocalStorage.setItem("host", config.host);
  LocalStorage.setItem("token", config.token);
}

export async function deleteLink(slug: string): Promise<void> {
  await fetchWithAuth("/api/link/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: { slug },
  });
}

export async function editLink(slug: string, url: string, comment?: string) {
  return fetchWithAuth("/api/link/edit", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: { slug, url, comment },
  });
}
