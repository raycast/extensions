import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { WebsiteAnalytics } from "./components/website-analytics";
import { api } from "./lib/api";
import { APP_URL } from "./lib/client";
import { dashboardUrl, formatCount, websiteKey, websiteName } from "./lib/format";
import { loadLiveCounts } from "./lib/report";
import { Website } from "./lib/types";
import { useWebsites } from "./lib/use-websites";

const websiteIcon = (website: Website): Image.ImageLike =>
  website.logo ? { source: website.logo, fallback: Icon.Globe } : Icon.Globe;

export default function Command() {
  const { data: websites, isLoading } = useWebsites();
  const { data: liveCounts } = useCachedPromise(
    (loadedWebsites: Website[]) => loadLiveCounts(api(), loadedWebsites),
    [websites ?? []],
    { execute: (websites?.length ?? 0) > 1 },
  );

  if (websites?.length === 1) return <WebsiteAnalytics website={websites[0]} />;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search websites">
      <List.EmptyView
        icon={Icon.Globe}
        title="No Websites Found"
        description="Add a website in Flowsery to see its analytics here."
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Add Website" url={`${APP_URL}/add-website`} />
          </ActionPanel>
        }
      />
      {websites?.map((website) => {
        const liveCount = liveCounts?.[websiteKey(website)];
        return (
          <List.Item
            key={websiteKey(website)}
            title={websiteName(website)}
            icon={websiteIcon(website)}
            accessories={
              liveCount === undefined ? [] : [{ text: `${formatCount(liveCount)} live`, icon: Icon.TwoPeople }]
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Analytics"
                  icon={Icon.BarChart}
                  target={<WebsiteAnalytics website={website} />}
                />
                <Action.OpenInBrowser title="Open Dashboard" url={dashboardUrl(website)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
