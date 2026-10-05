export const GITHUB_CONFIG = {
  OWNER: "rstacruz",
  REPO: "cheatsheets",
  BRANCH: "master",
} as const;

export const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_CONFIG.OWNER}/${GITHUB_CONFIG.REPO}`;
export const GITHUB_RAW_URL = `https://raw.githubusercontent.com/${GITHUB_CONFIG.OWNER}/${GITHUB_CONFIG.REPO}/${GITHUB_CONFIG.BRANCH}`;
export const DEVHINTS_URL = "https://devhints.io";
