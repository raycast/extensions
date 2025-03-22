import { withAccessToken } from "@raycast/utils";
import { slack } from "./client/WebClient";

export function withSlackClient<T>(Component: React.ComponentType<T>) {
  return withAccessToken<T>(slack)(Component);
}
