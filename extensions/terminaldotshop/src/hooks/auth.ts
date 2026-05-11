import { OAuth } from "@raycast/api";
import { getAccessToken, OAuthService } from "@raycast/utils";
import { useQuery } from "@tanstack/react-query";
import Terminal from "@terminaldotshop/sdk";
import { config } from "./config";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Terminal",
  providerIcon: "icon.png",
  description: "Sign in with Terminal.shop",
});

export const provider = new OAuthService({
  client,
  ...config().auth,
  scope: "",
  bodyEncoding: "url-encoded",
});

const makeTerminal = (token: string) =>
  new Terminal({ environment: config().env, appId: "raycast", bearerToken: token });

export const useTerminal = () => {
  const { token } = getAccessToken();
  const { data } = useQuery({
    queryKey: ["terminal", token],
    queryFn: () => {
      return makeTerminal(token);
    },
    initialData: makeTerminal(token),
  });

  return data;
};
