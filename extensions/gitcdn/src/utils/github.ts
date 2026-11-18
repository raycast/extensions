import * as fs from "fs";

export interface RepoInfo {
  owner: string;
  repo: string;
  branch: string;
}

export const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".bmp"];

export function parseRepoUrl(url: string): RepoInfo | null {
  const githubMatch = url.match(/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?(?:\/blob\/([^/]+))?/);
  if (githubMatch) {
    return {
      owner: githubMatch[1],
      repo: githubMatch[2],
      branch: githubMatch[3] || githubMatch[4] || "main",
    };
  }

  const simpleMatch = url.match(/^([^/]+)\/([^/]+)$/);
  if (simpleMatch) {
    return {
      owner: simpleMatch[1],
      repo: simpleMatch[2],
      branch: "main",
    };
  }

  return null;
}

export function isImageFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function validateGitHubToken(token: string): { valid: boolean; error?: string } {
  if (!token || token.trim() === "") {
    return { valid: false, error: "Token cannot be empty" };
  }

  // GitHub tokens start with ghp_ (personal access tokens) or github_pat_ (fine-grained tokens)
  if (!token.startsWith("ghp_") && !token.startsWith("github_pat_")) {
    return {
      valid: false,
      error: "Invalid token format. GitHub tokens should start with 'ghp_' or 'github_pat_'",
    };
  }

  return { valid: true };
}

export async function getDefaultBranch(owner: string, repo: string, githubToken?: string): Promise<string> {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;

  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
  };

  if (githubToken) {
    headers.Authorization = `token ${githubToken}`;
  }

  const response = await fetch(apiUrl, { headers });
  if (!response.ok) {
    // Fallback to "main" if we can't fetch the default branch
    return "main";
  }

  const data = await response.json();
  return data.default_branch || "main";
}

export async function uploadFileToRepo(
  repoInfo: RepoInfo,
  filePath: string,
  targetPath: string,
  githubToken: string,
): Promise<void> {
  const { owner, repo, branch } = repoInfo;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${targetPath}`;

  // Read file and encode to base64
  const fileContent = fs.readFileSync(filePath);
  const base64Content = fileContent.toString("base64");

  const response = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `token ${githubToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `Add file: ${targetPath}`,
      content: base64Content,
      branch: branch,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    if (response.status === 422 && error.message?.includes("already exists")) {
      // File exists, try to update it
      return updateFileInRepo(repoInfo, filePath, targetPath, githubToken);
    }
    throw new Error(error.message || `Failed to upload: ${response.statusText}`);
  }
}

export async function updateFileInRepo(
  repoInfo: RepoInfo,
  filePath: string,
  targetPath: string,
  githubToken: string,
): Promise<void> {
  const { owner, repo, branch } = repoInfo;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${targetPath}`;

  // Get current file SHA
  const getResponse = await fetch(`${apiUrl}?ref=${branch}`, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `token ${githubToken}`,
    },
  });

  if (!getResponse.ok) {
    throw new Error(`Failed to get file info: ${getResponse.statusText}`);
  }

  const fileInfo = await getResponse.json();
  const sha = fileInfo.sha;

  // Read file and encode to base64
  const fileContent = fs.readFileSync(filePath);
  const base64Content = fileContent.toString("base64");

  const response = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `token ${githubToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `Update file: ${targetPath}`,
      content: base64Content,
      branch: branch,
      sha: sha,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to update: ${response.statusText}`);
  }
}

export async function deleteFileFromRepo(
  repoInfo: RepoInfo,
  filePath: string,
  sha: string,
  githubToken: string,
): Promise<void> {
  const { owner, repo, branch } = repoInfo;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

  const response = await fetch(apiUrl, {
    method: "DELETE",
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `token ${githubToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `Delete file: ${filePath}`,
      branch: branch,
      sha: sha,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to delete: ${response.statusText}`);
  }
}
