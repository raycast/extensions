import { withAccessToken, WithAccessTokenComponentOrFn } from "@raycast/utils";
import { slack } from "./client/WebClient";

export function withSlackClient(Component: WithAccessTokenComponentOrFn) {
  return withAccessToken(slack)(Component);
}
