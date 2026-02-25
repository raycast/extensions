import type { WorktreeItem } from "./git";

export const USE_MOCK_DATA = false;

const MOCK_ROOT = "/Users/you/Desktop/dev";
const MOCK_REPO = "my-app";

export const MOCK_WORKTREES: WorktreeItem[] = [
  {
    path: `${MOCK_ROOT}/${MOCK_REPO}`,
    branch: "main",
    repoName: MOCK_REPO,
    isMain: true,
    repoRoot: `${MOCK_ROOT}/${MOCK_REPO}`,
  },
  {
    path: `${MOCK_ROOT}/${MOCK_REPO}-feature-auth`,
    branch: "feature/auth",
    repoName: MOCK_REPO,
    isMain: false,
    repoRoot: `${MOCK_ROOT}/${MOCK_REPO}`,
  },
  {
    path: `${MOCK_ROOT}/${MOCK_REPO}-fix-login`,
    branch: "fix/login",
    repoName: MOCK_REPO,
    isMain: false,
    repoRoot: `${MOCK_ROOT}/${MOCK_REPO}`,
  },
  {
    path: `${MOCK_ROOT}/other-repo`,
    branch: "develop",
    repoName: "other-repo",
    isMain: true,
    repoRoot: `${MOCK_ROOT}/other-repo`,
  },
];

export const MOCK_REPOS = [
  { path: `${MOCK_ROOT}/${MOCK_REPO}`, name: MOCK_REPO },
  { path: `${MOCK_ROOT}/other-repo`, name: "other-repo" },
];

export const MOCK_BRANCHES = ["main", "develop", "feature/auth", "fix/login", "feature/dashboard"];
