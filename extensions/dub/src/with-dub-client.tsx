import { withAccessToken } from "@raycast/utils";
import React from "react";
import { dubOAuth } from "@api/oauth";

export function withDubClient<T>(Component: React.ComponentType<T>) {
  return withAccessToken(dubOAuth)(Component);
}
