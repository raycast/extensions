import { Branch } from "../../models";

export interface State {
  repositoryPath?: string | undefined;
  branches?: Branch[];
  isLoading: boolean;
  error?: Error;
}

export const initialState: State = { isLoading: true };

type actions =
  | ["set_repository_path", string]
  | ["set_branches", Branch[]]
  | ["set_loading", boolean]
  | ["set_error", Error | undefined];

export function reducer(state: State, [type, payload]: actions): typeof initialState {
  switch (type) {
    case "set_repository_path":
      return { ...state, repositoryPath: payload };
    case "set_branches":
      return { ...state, branches: payload };
    case "set_error":
      return { ...state, error: payload };
    case "set_loading":
      return { ...state, isLoading: payload };
    default:
      throw new Error("Unknown action: " + type);
  }
}
