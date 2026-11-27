import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { address, readSites } from "./data";
import { openLink } from "./forkz";

export default function Command() {
  const { data, isLoading, error, revalidate } = usePromise(readSites);
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search sites">
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="forkz's sites could not be read"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.Globe}
          title="No saved sites"
          description="Add one in forkz with File > Connect to Server."
        />
      )}
      {(data ?? []).map((site) => (
        <List.Item
          key={site.id || site.name}
          icon={Icon.Globe}
          title={site.name}
          // Not "Box" again for a site named Box.
          subtitle={address(site) === site.name ? "" : address(site)}
          accessories={site.folder ? [{ tag: site.folder }] : []}
          keywords={[site.host, site.user, site.protocol]}
          actions={
            <ActionPanel>
              <Action
                // eslint-disable-next-line @raycast/prefer-title-case -- forkz is the app's name, lowercase
                title="Connect in forkz"
                icon={Icon.ArrowRight}
                onAction={() => openLink("connect", { site: site.name })}
              />
              <Action.CopyToClipboard title="Copy Address" content={address(site)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
