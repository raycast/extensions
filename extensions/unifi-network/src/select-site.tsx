import { Action, ActionPanel, Color, List, showToast, Toast } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useEffect } from "react";
import { useSites } from "./hooks/useSites";
import { useUnifi } from "./hooks/useUnifi";
import type { Site } from "./lib/unifi/types/site";

export default function Command() {
  const { value: selected, setValue: setSite } = useLocalStorage<Site>("selected-site", undefined);
  const { client: unifiClient } = useUnifi();
  const { sites, isLoading, error } = useSites({ unifi: unifiClient });

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error.message,
      });
    }
  }, [error]);

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
              <Action title="Select" onAction={() => setSite(site)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
