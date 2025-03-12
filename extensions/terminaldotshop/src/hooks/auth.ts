import { OAuth } from "@raycast/api";
import { getAccessToken, OAuthService } from "@raycast/utils";
import { useQuery } from "@tanstack/react-query";
import Terminal from "@terminaldotshop/sdk";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Terminal",
  providerIcon: "icon.png",
  description: "Sign in with Terminal.shop",
});

export const provider = new OAuthService({
  client,
  clientId: "cli_01JN7ER9SNPQRWB42BF2Y183C1",
  authorizeUrl: "https://auth.dev.terminal.shop/authorize",
  tokenUrl: "https://auth.dev.terminal.shop/token",
  refreshTokenUrl: "https://auth.dev.terminal.shop/token",
  scope: "",
  bodyEncoding: "url-encoded",
  onAuthorize: (t) => {
    console.log("========== authorize (raycast)", t.token);
    const mid = t.token.split(".")[1];
    const data = JSON.parse(Buffer.from(mid, "base64").toString());
    const date = new Date(data.exp * 1000);
    console.log("========== expires", date.toLocaleString());
  },
});

const makeTerminal = (token: string) => new Terminal({ environment: "dev", appId: "raycast", bearerToken: token });

export const useTerminal = () => {
  const { token } = getAccessToken();
  const { data } = useQuery({
    queryKey: ["terminal", token],
    queryFn: () => {
      console.log("========= new token (queryclient)", token);
      const mid = token.split(".")[1];
      const data = JSON.parse(Buffer.from(mid, "base64").toString());
      const date = new Date(data.exp * 1000);
      console.log("========== expires", date.toLocaleString());
      return makeTerminal(token);
    },
    initialData: makeTerminal(token),
  });

  return data;
};
