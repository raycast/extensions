import { Detail, OAuth } from "@raycast/api";
import { useEffect, useState } from "react";
import { authorize, client } from "../api/oauth";

export default function withAsanaAuth(component: JSX.Element) {
  const [tokenSet, setTokenSet] = useState<OAuth.TokenSet>();

  useEffect(() => {
    async function authenticate() {
      await authorize();
      const tokenSet = await client.getTokens();

      if (tokenSet) {
        setTokenSet(tokenSet);
      } else {
        throw Error("Failed to authenticate");
      }
    }

    authenticate();
  }, []);

  if (!tokenSet) {
    return <Detail isLoading />;
  }

  return component;
}
