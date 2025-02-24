import { List, ActionPanel, Action } from "@raycast/api";
import { Site } from "unifi-client";
import { showErrorToast } from "../../utils";
import { useSites } from "./hooks";
import { useEffect, type ReactNode } from "react";

export function SelectSite(props: { onSiteSelectAction: (site: Site) => ReactNode }) {
  const { data: sites, error, isLoading } = useSites();

  useEffect(() => {
    if (error) {
      showErrorToast(error);
    }
  }, [error]);

  return (
    <>
      {sites && sites.length === 1 ? (
        props.onSiteSelectAction(sites[0])
      ) : (
        <List isLoading={isLoading}>
          {sites?.map((s) => (
            <List.Item
              key={s._id}
              title={s.name}
              actions={
                <ActionPanel>
                  <Action.Push title="Select Site" target={props.onSiteSelectAction(s)} />
                </ActionPanel>
              }
            />
          ))}
        </List>
      )}
    </>
  );
}
