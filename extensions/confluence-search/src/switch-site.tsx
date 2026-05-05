import "cross-fetch/polyfill";
import { ActionPanel, Action, Detail, Icon, List, useNavigation } from "@raycast/api";
import { setActiveSite } from "./api/site";
import { fetchSites } from "./api/atlassian";
import { authorizeSite } from "./api/auth";
import { usePromise } from "@raycast/utils";

export default function Command() {
  const { pop } = useNavigation();

  const { isLoading, data: sites = [] } = usePromise(
    async () => {
      await authorizeSite(false);
      const sites = await fetchSites();
      return sites;
    },
    [],
    {
      failureToastOptions: {
        title: "Could not load sites",
      },
    },
  );

  if (isLoading) {
    return <Detail isLoading={isLoading} />;
  }

  return (
    <List isLoading={isLoading}>
      {sites.map((site) => {
        return (
          <List.Item
            key={site.id}
            id={site.id}
            icon={Icon.TextDocument}
            title={site.url}
            actions={
              <ActionPanel>
                <Action
                  title="Select"
                  onAction={async () => {
                    await setActiveSite(site);
                    pop();
                  }}
                />
                <Action.OpenInBrowser title="Open in Browser" url={site.url} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
