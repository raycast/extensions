import { Action, ActionPanel, Color, Icon, List, showHUD, useNavigation } from "@raycast/api";
import { useCallback, useState } from "react";
import { getSelectedSite, setSelectedSite } from "./api/preferences";
import type { Site } from "./api/types";
import { ResourceError } from "./components/states";
import { useAsyncResource } from "./hooks/use-async-resource";
import { useUniFiClient } from "./hooks/use-unifi";

export default function SelectSite() {
  const client = useUniFiClient();
  const { pop } = useNavigation();
  const [selected, setSelected] = useState<Site>();
  const load = useCallback(
    async (signal: AbortSignal) => {
      const [sites, current] = await Promise.all([client.listSites(signal), getSelectedSite()]);
      setSelected(current);
      return sites;
    },
    [client],
  );
  const { data: sites = [], error, isLoading, revalidate } = useAsyncResource(load);

  const selectSite = async (site: Site) => {
    await setSelectedSite(site);
    setSelected(site);
    await showHUD(`Selected ${site.name}`);
    pop();
  };

  if (error) return <ResourceError error={error} onRetry={revalidate} />;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search sites by name or internal reference">
      {sites?.map((site) => (
        <List.Item
          key={site.id}
          title={site.name}
          subtitle={site.internalReference}
          keywords={[site.id, site.internalReference]}
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
              <Action title="Select Site" icon={Icon.Checkmark} onAction={() => selectSite(site)} />
              <Action.CopyToClipboard title="Copy Site ID" content={site.id} />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && sites.length === 0 ? <List.EmptyView title="No Network sites found" /> : null}
    </List>
  );
}
