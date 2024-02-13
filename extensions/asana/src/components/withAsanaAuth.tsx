import { OAuthService, getAccessToken, withAccessToken } from "@raycast/utils";

const asana = OAuthService.asana({ scope: "default" });

export default function withAsanaAuth(Component: React.ComponentType) {
  return withAccessToken(asana)(Component);
}

export function getOAuthToken(): string {
  const { token } = getAccessToken();
  return token;
}
