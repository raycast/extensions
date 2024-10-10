import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useState } from "react";
import { useAppStoreConnectApi } from "./Hooks/useAppStoreConnect";
import { App, appSchemas } from "./Model/schemas";
import AppItem from "./Components/AppItem";
import SignIn from "./Components/SignIn";
import BetaGroupsList from "./Components/BetaGroupsList";

export default function Command() {
  const [path, setPath] = useState<string | undefined>(undefined);

  const { data, isLoading } = useAppStoreConnectApi(path, (response) => {
    return appSchemas.safeParse(response.data).data;
  });

  return (
    <SignIn
      didSignIn={() => {
        setPath("/apps");
      }}
    >
      <List isLoading={isLoading}>
        {data?.map((app: App) => (
          <AppItem
            id={app.id}
            title={app.attributes.name}
            app={app}
            actions={
              <ActionPanel>
                <Action.Push title="Show Groups" icon={Icon.TwoPeople} target={<BetaGroupsList app={app} />} />
              </ActionPanel>
            }
          />
        ))}
      </List>
    </SignIn>
  );
}
