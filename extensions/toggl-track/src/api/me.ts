import { get } from "./toggleClient";
import { Me } from "./types";

export function getMe() {
  return get<Me>("/me");
}
