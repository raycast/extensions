import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { Config } from "./panels/config";
import { State } from "./panels/state";
import { Transitions } from "./panels/transitions";
import { Setup } from "./setup";
import { API_URL, MRU_DOMAIN, PRIVATE_KEY, getFromStoreOrDefault, removeFromStore } from "./utils/storage";
import { hasValidCredentials } from "./utils/helpers";

export default function MainMenu() {
  const nav = useNavigation();

  const logout = async () => {
    await removeFromStore(API_URL);
    await removeFromStore(MRU_DOMAIN);
    nav.push(<Setup />);
  };

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>();
  const [apiUrl, setApiUrl] = useState<string>("");

  useEffect(() => {
    async function checkConnection() {
      const apiUrl = await getFromStoreOrDefault<string>(API_URL, "");
      const privateKey = await getFromStoreOrDefault<string>(PRIVATE_KEY, "");
      setApiUrl(apiUrl);
      setIsConnected(await hasValidCredentials(apiUrl, privateKey));
      setIsLoading(false);
    }

    checkConnection();
  }, []);

  useEffect(() => {
    if (!isLoading && !isConnected) {
      nav.push(<Setup />);
    }
  }, [isLoading, isConnected]);

  return (
    <List isLoading={isLoading}>
      <List.Item
        icon={Icon.Livestream}
        title="State"
        actions={
          <ActionPanel>
            <Action.Push title="State" target={<State apiUrl={apiUrl} />} />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.Play}
        title="Transitions"
        actions={
          <ActionPanel>
            <Action.Push title="Transitions" target={<Transitions apiUrl={apiUrl} />} />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.Cog}
        title="Config"
        actions={
          <ActionPanel>
            <Action.Push title="Config" target={<Config apiUrl={apiUrl} />} />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.TennisBall}
        title="Open in Playground"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open in Playground" url={`https://playground.stf.xyz?apiUrl=${apiUrl}`} />
          </ActionPanel>
        }
        accessories={[
          {
            icon: Icon.Link,
          },
        ]}
      />
      <List.Item
        icon={Icon.Logout}
        title="Logout"
        actions={
          <ActionPanel>
            <Action title="Logout" onAction={logout} />
          </ActionPanel>
        }
      />
    </List>
  );
}
