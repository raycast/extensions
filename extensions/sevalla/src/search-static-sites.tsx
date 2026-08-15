import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { makeRequest } from "./sevalla";
import { StaticSite, StaticSiteDetailed } from "./types";
import OpenInSevallaAction from "./components/OpenInSevallaAction";
import DeleteStaticSiteAction from "./components/DeleteStaticSiteAction";
import GetDeploymentDetails from "./views/get-deployment-details";

const STATUS_TAGS: Partial<Record<StaticSite["status"], string | { value: string; color: Color }>> = {
  deploymentInProgress: "Deploying...",
  deploymentSuccess: { value: "Deployed", color: Color.Green },
};

export default function SearchStaticSites() {
  const {
    isLoading,
    data: sites,
    mutate,
  } = useCachedPromise(
    async () => {
      const result = await makeRequest<{ company: { static_sites: { items: StaticSite[] } } }>("static-sites");
      return result.company.static_sites.items;
    },
    [],
    {
      initialData: [],
    },
  );
  return (
    <List isLoading={isLoading}>
      {!isLoading && !sites.length ? (
        <List.EmptyView
          title="Create your first static site"
          actions={
            <ActionPanel>
              <OpenInSevallaAction title="Add a Static Site" route="staticSites/new" />
            </ActionPanel>
          }
        />
      ) : (
        sites.map((site) => (
          <List.Item
            key={site.id}
            icon={Icon.Bolt}
            title={site.display_name}
            subtitle={site.name}
            accessories={[{ tag: STATUS_TAGS[site.status] || site.status }]}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Bolt} title="Static Site Details" target={<StaticSiteDetails site={site} />} />
                <OpenInSevallaAction route="staticSites" />
                <DeleteStaticSiteAction site={site} mutateSites={mutate} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function StaticSiteDetails({ site }: { site: StaticSite }) {
  const { isLoading, data: details } = useCachedPromise(
    async (siteId: string) => {
      const result = await makeRequest<{ static_site: StaticSiteDetailed }>(`static-sites/${siteId}`);
      return result.static_site;
    },
    [site.id],
  );

  return (
    <List isLoading={isLoading} isShowingDetail navigationTitle={`Search Static Sites / ${site.display_name}`}>
      {details && (
        <>
          <List.Item
            icon={Icon.Bolt}
            title="Site Details"
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Domain" text={details.hostname} />
                    <List.Item.Detail.Metadata.Label
                      title="Status"
                      icon={{
                        source: Icon.Dot,
                        tintColor: details.status === "deploymentSuccess" ? Color.Green : undefined,
                      }}
                      text={details.status === "deploymentSuccess" ? "Deployed" : details.status}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Source"
                      icon={getFavicon(new URL(details.repo_url).origin)}
                      text={new URL(details.repo_url).pathname.slice(1)}
                    />
                    <List.Item.Detail.Metadata.Link
                      title=""
                      text={details.default_branch}
                      target={`${details.repo_url}/tree/${details.default_branch}`}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser icon={Icon.ArrowNe} title="Visit Site" url={`https://${details.hostname}`} />
              </ActionPanel>
            }
          />
          <List.Section title="Deployments">
            {details.deployments.map((deployment, index) => (
              <List.Item
                key={deployment.id}
                icon={`number-${String(index + 1).padStart(2, "0")}-16`}
                title={{ value: deployment.commit_message || "", tooltip: deployment.commit_message }}
                detail={
                  <List.Item.Detail
                    markdown={deployment.commit_message}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label
                          title="Date & Deploy time"
                          icon={Icon.Calendar}
                          text={new Date(deployment.created_at).toDateString()}
                        />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <Action.Push
                      icon={Icon.Airplane}
                      title="Deployment Details"
                      target={<GetDeploymentDetails deployment={deployment} site={site} />}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
