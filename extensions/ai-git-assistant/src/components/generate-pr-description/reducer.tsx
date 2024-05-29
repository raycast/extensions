import { Application } from "@raycast/api";

export interface State {
  frontmostApplication?: string | undefined;
  repositoryPath: string;
  currentBranchName?: string;
  baseBranchName: string;
  prDescription?: string | undefined;
  isLoading: boolean;
  revalidationCount?: number;
  error?: Error;
}

export function initialState(repositoryPath: string, baseBranchName: string): State {
  return { repositoryPath: repositoryPath, baseBranchName: baseBranchName, isLoading: true };
}

type actions =
  | ["set_frontmost_application", Application]
  | ["set_pr_description", string]
  | ["set_current_branch", string]
  | ["set_loading", boolean]
  | ["set_error", Error | undefined]
  | ["revalidate"];

export function reducer(state: State, [type, payload]: actions): State {
  switch (type) {
    case "set_frontmost_application":
      return { ...state, frontmostApplication: payload?.name || "Active app" };
    case "set_pr_description":
      return { ...state, prDescription: payload };
    case "set_current_branch":
      return { ...state, currentBranchName: payload };
    case "set_error":
      return { ...state, error: payload };
    case "set_loading":
      return { ...state, isLoading: payload };
    case "revalidate":
      return {
        ...state,
        error: undefined,
        prDescription: undefined,
        revalidationCount: (state.revalidationCount || 0) + 1,
      };
    default:
      throw new Error("Unknown action: " + type);
  }
}
