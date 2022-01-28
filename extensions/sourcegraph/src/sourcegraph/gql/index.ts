import fetch from "node-fetch";

import { Sourcegraph } from "..";

export class AuthError extends Error {
  message: string;
  constructor(message: string) {
    super();
    this.message = message;
  }
}

async function doRequest<T>(abort: AbortSignal, src: Sourcegraph, query: string): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (src.token) {
    headers["Authorization"] = `token ${src.token}`;
  }
  return new Promise<T>((resolve, reject) => {
    fetch(`${src.instance}/.api/graphql`, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ query }),
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
      });
  });
}

export async function checkAuth(abort: AbortSignal, src: Sourcegraph) {
  const q = `query currentUser { currentUser { username, id } }`;
  return doRequest<{ currentUser: { username: string; id: string } }>(abort, src, q);
}

export interface NotebookMarkdownBlock {
  markdownInput?: string;
}

export interface NotebookQueryBlock {
  queryInput?: string;
}

export interface NotebookFileBlock {
  fileInput?: {
    repositoryName: string;
    filePath: string;
  };
}

export interface SearchNotebook {
  id: string;
  title: string;
  viewerHasStarred: boolean;
  public: boolean;
  stars?: { totalCount: number };
  creator: {
    username: string;
    displayName?: string;
  };
  blocks?: (NotebookMarkdownBlock & NotebookQueryBlock & NotebookFileBlock)[];
  createdAt: string;
  updatedAt: string;
}

export async function findNotebooks(abort: AbortSignal, src: Sourcegraph, query?: string) {
  let args = "";
  if (query) {
    args = `query:"${query}",orderBy:NOTEBOOK_STAR_COUNT,descending:true`;
  } else {
    args = "orderBy:NOTEBOOK_UPDATED_AT,descending:true";
    if (src.token) {
      const {
        currentUser: { id },
      } = await checkAuth(abort, src);
      args = `starredByUserID:"${id}",${args}`;
    }
  }
  const q = `{
    notebooks(${args}) {
      nodes {
        id
        title
        viewerHasStarred
        public
        stars { totalCount }
        creator {
          username
          displayName
        }
        blocks {
          __typename
          ... on MarkdownBlock {
            markdownInput
          }
          ... on QueryBlock {
            queryInput
          }
          ... on FileBlock {
            fileInput {
              repositoryName
              filePath
            }
          }
        }
        createdAt
        updatedAt
      }
    }
  }`;
  return doRequest<{ notebooks?: { nodes?: SearchNotebook[] } }>(abort, src, q);
}
