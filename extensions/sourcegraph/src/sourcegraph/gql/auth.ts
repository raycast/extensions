import { Sourcegraph } from "..";
import { getProxiedFetch } from "./fetchProxy";

export class AuthError extends Error {
  message: string;
  constructor(message: string) {
    super();
    this.message = message;
  }
}

async function doGQLRequest<T>(abort: AbortSignal, src: Sourcegraph, body: string): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Requested-With": "Raycast-Sourcegraph",
  };
  if (src.token) {
    headers["Authorization"] = `token ${src.token}`;
  }
  return new Promise<T>((resolve, reject) => {
    getProxiedFetch(src.proxy)(`${src.instance}/.api/graphql`, {
      method: "POST",
      headers: headers,
      body,
      signal: abort,
    })
      .then((r) => {
        if (r.status == 401 || r.status == 403) {
          return reject(new AuthError(`${r.status} ${r.statusText}`));
        } else if (r.status >= 400) {
          return r
            .text()
            .then((t) => {
              return reject(new Error(`${r.status} ${r.statusText}: ${t}`));
            })
            .catch((e) => {
              return reject(new Error(`${r.status} ${r.statusText}: ${e}`));
            });
        }

        return r.json();
      })
      .then((data) => {
        const resp = data as { data?: T; errors?: { message: string }[] };
        if (resp?.data) {
          resolve(resp.data as T);
        } else if (resp?.errors) {
          reject(resp.errors.map((e) => e.message).join("\n\n"));
        } else {
          reject(`Unknown in response: ${JSON.stringify(resp)}`);
        }
      })
      .catch((err) => reject(err));
  });
}

/**
 * DEPRECATED - use apollo instead for making API requests.
 */
async function doQuery<T>(abort: AbortSignal, src: Sourcegraph, name: string, query: string): Promise<T> {
  return doGQLRequest<T>(abort, src, JSON.stringify({ query: `query raycastSourcegraph${name} ${query}` }));
}

export async function checkAuth(abort: AbortSignal, src: Sourcegraph) {
  const q = `{ currentUser { username, id } }`;
  return doQuery<{ currentUser: { username: string; id: string } }>(abort, src, "CheckAuth", q);
}
