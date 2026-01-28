import { Action, ActionPanel, Color, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect } from "react";
import useSites from "./hooks/use-sites";
import useUnifi from "./hooks/use-unifi";
import { type Site } from "./lib/unifi/types/site";
import AuthPrompt from "./prompts/auth-prompt";
import useAuth from "./hooks/use-auth";

export default function SelectSite() {
  const { client: unifiClient } = useUnifi();
  const navigation = useNavigation();
  const { sites, isLoading, error, selected, setSite } = useSites({ unifi: unifiClient });
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return <List isLoading={true} />;
  }

  if (!isAuthenticated) {
    return <AuthPrompt />;
  }

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error.message,
      });
    }
  }, [error]);

  const selectSite = async (site: Site) => {
    setSite(site);
    navigation.pop();
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search sites by name">
      {sites?.map((site) => (
        <List.Item
          key={site.id}
          title={site.name}
          accessories={
            selected?.id === site.id
              ? [
                  {
                    tag: {
                      value: "Selected",
                      color: Color.Green,
                    },
                  },
                ]
              : []
          }
          actions={
            <ActionPanel>
              <Action title="Select" onAction={() => selectSite(site)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
