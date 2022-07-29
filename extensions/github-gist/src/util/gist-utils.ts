import { Octokit } from "@octokit/core";
import { isEmpty, preference } from "./utils";

export interface GistFile {
  filename: string;
  content: string;
}

export interface GistItem {
  filename: string;
  language: string;
  raw_url: string;
}
export interface Gist {
  gist_id: string;
  description: string;
  html_url: string;
  file: GistItem[];
}

export enum GITHUB_GISTS {
  MY_GISTS = "My Gists",
  STARRED = "Starred Gists",
  ALL_GISTS = "All Public Gists",
}
export const githubGists = Object.values(GITHUB_GISTS);

export const octokit = new Octokit({ auth: `${preference.personalAccessTokens}` });

export async function requestGist(route: string, page: number, perPage: number) {
  const response = await (async () => {
    switch (route) {
      case GITHUB_GISTS.MY_GISTS: {
        return await octokit.request(`GET /gists`, { page: page, per_page: perPage });
      }
      case GITHUB_GISTS.ALL_GISTS: {
        return await octokit.request(`GET /gists/public`, { page: page, per_page: perPage });
      }
      case GITHUB_GISTS.STARRED: {
        return await octokit.request(`GET /gists/starred`, { page: page, per_page: perPage });
      }
      default: {
        return await octokit.request(`GET /gists`, { page: page, per_page: perPage });
      }
    }
  })();
  const _gists: Gist[] = [];
  response.data.forEach((_data) => {
    const _gist: Gist = {
      gist_id: _data.id,
      description: isEmpty(String(_data.description)) ? "[ No description ]" : String(_data.description),
      html_url: _data.html_url,
      file: [],
    };
    for (const value of Object.values(_data.files)) {
      _gist.file.push({
        filename: String(value.filename),
        language: String(value.language),
        raw_url: String(value.raw_url),
      });
    }
    _gists.push(_gist);
  });
  return _gists;
}

export async function starGist(gist_id: string) {
  return await octokit.request(`PUT /gists/${gist_id}/star`, {
    gist_id: gist_id,
  });
}
export async function unStarGist(gist_id: string) {
  return await octokit.request(`DELETE /gists/${gist_id}/star`, {
    gist_id: gist_id,
  });
}
export async function deleteGist(gist_id: string) {
  return await octokit.request(`DELETE /gists/${gist_id}`, {
    gist_id: gist_id,
  });
}

export async function createGist(description: string, isPublic = false, gistFiles: GistFile[]) {
  const files: { [p: string]: { content: string } } = {};
  gistFiles.forEach((value) => {
    files[value.filename] = { content: value.content };
  });
  return await octokit.request("POST /gists", {
    description: description,
    public: isPublic,
    files: files,
  });
}

export async function updateGist(gistId: string, description: string, oldFileNames: string[], newFiles: GistFile[]) {
  const files: { [p: string]: { content: string } } = {};
  const newFileName = newFiles.map((value) => value.filename);
  const deleteFiles = oldFileNames.filter((value) => !newFileName.includes(value));
  newFiles.forEach((value) => {
    files[value.filename] = { content: value.content };
  });
  deleteFiles.forEach((value) => {
    files[value] = { content: "" };
  });
  return await octokit.request("PATCH /gists/" + gistId, {
    description: description,
    files: files,
  });
}

export function checkGistFileContent(gistFiles: GistFile[]) {
  const isValid = { valid: true, contentIndex: "" };
  gistFiles.forEach((value, index) => {
    if (isEmpty(value.content)) {
      isValid.valid = false;
      isValid.contentIndex = isValid.contentIndex + " " + (index + 1);
    }
  });
  return isValid;
}
export function checkGistFileName(gistFiles: GistFile[]) {
  const nameSet = new Set();
  const nameList = [];
  gistFiles.forEach((value) => {
    if (!isEmpty(value.filename)) {
      nameSet.add(value.filename);
      nameList.push(value.filename);
    }
  });
  return nameSet.size === nameList.length;
}
