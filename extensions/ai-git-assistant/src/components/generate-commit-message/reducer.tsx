import { Application } from "@raycast/api";

export interface State {
  frontmostApplication?: string | undefined;
  repositoryPath?: string | undefined;
  commitMessage?: string | undefined;
  isLoading: boolean;
  revalidationCount?: number;
  error?: Error;
}

export const initialState: State = { isLoading: true };

type actions =
  | ["set_frontmost_application", Application]
  | ["set_repository_path", string]
  | ["set_commit_message", string]
  | ["set_loading", boolean]
  | ["set_error", Error | undefined]
  | ["revalidate"];

export function reducer(state: State, [type, payload]: actions): typeof initialState {
  switch (type) {
    case "set_frontmost_application":
      return { ...state, frontmostApplication: payload?.name || "Active app" };
    case "set_repository_path":
      return { ...state, repositoryPath: payload };
    case "set_commit_message":
      return { ...state, commitMessage: payload };
    case "set_error":
      return { ...state, error: payload };
    case "set_loading":
      return { ...state, isLoading: payload };
    case "revalidate":
      return {
        ...state,
        error: undefined,
        commitMessage: undefined,
        repositoryPath: undefined,
        revalidationCount: (state.revalidationCount || 0) + 1,
      };
    default:
      throw new Error("Unknown action: " + type);
  }
}
