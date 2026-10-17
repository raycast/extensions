export interface GitHubFileDiff {
  filename: string;
  status:
    | "added"
    | "removed"
    | "modified"
    | "renamed"
    | "copied"
    | "changed"
    | "unchanged";
  previous_filename?: string;
}

// Fetch the latest commit SHA from the main branch of fmhy/edit
export async function fetchLatestCommitSha(): Promise<string> {
  const url = "https://api.github.com/repos/fmhy/edit/commits/main";
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Raycast-FMHY-Search-Extension",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch latest commit: ${res.statusText}`);
  }

  const data = (await res.json()) as { sha: string };
  return data.sha;
}

// Fetch the raw content of a specific file in the repository
export async function fetchRawFileContent(path: string): Promise<string> {
  const url = `https://raw.githubusercontent.com/fmhy/edit/main/docs/${path}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(
      `Failed to fetch file content for docs/${path}: ${res.statusText}`,
    );
  }

  return res.text();
}

// Compare two commits to get the list of changed files
export async function fetchCommitCompareDiffs(
  localSha: string,
  latestSha: string,
): Promise<GitHubFileDiff[]> {
  const url = `https://api.github.com/repos/fmhy/edit/compare/${localSha}...${latestSha}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Raycast-FMHY-Search-Extension",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to compare commits: ${res.statusText}`);
  }

  const data = (await res.json()) as { files?: GitHubFileDiff[] };
  return data.files || [];
}
