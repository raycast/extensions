import { Action, ActionPanel, Color, List, showToast, Toast } from "@raycast/api";
import { useEffect } from "react";
import useSites from "./hooks/useSites";
import { useUnifi } from "./hooks/useUnifi";

export default function Command() {
  const { client: unifiClient } = useUnifi();
  const { sites, isLoading, error, selected, setSite } = useSites({ unifi: unifiClient });

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
