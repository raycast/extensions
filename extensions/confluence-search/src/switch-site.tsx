import "./util/fetchPolyfill";
import { useState, useEffect } from "react";
import { ActionPanel, Action, Detail, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { setActiveSite, Site } from "./api/site";
import { fetchSites } from "./api/atlassian";
import { authorizeSite } from "./api/auth";

export default function Command() {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sites, setSites] = useState<Site[]>([]);

  useEffect(() => {
    (async () => {
      try {
        await authorizeSite(false);
        const sites = await fetchSites();
        setSites(sites);
        setIsLoading(false);
      } catch (error) {
        console.error(error);
        setIsLoading(false);
        showToast({ style: Toast.Style.Failure, title: String(error) });
      }
    })();
  }, []);

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
