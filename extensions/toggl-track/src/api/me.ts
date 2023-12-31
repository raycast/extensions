import { get } from "./toggleClient";

export function getMe() {
  return get<Me>("/me");
}

export interface Me {
  default_workspace_id: number;
}
