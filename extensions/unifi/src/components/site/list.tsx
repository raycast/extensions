import { List, ActionPanel, Action } from "@raycast/api";
import { Site } from "unifi-client";
import { showErrorToast } from "../../utils";
import { useSites } from "./hooks";

export function SelectSite(props: { onSiteSelectAction: (site: Site) => JSX.Element }) {
  const { data: sites, error, isLoading } = useSites();
  showErrorToast(error);
  if (sites && sites.length === 1) {
    return props.onSiteSelectAction(sites[0]);
  }
  return (
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
  );
}
