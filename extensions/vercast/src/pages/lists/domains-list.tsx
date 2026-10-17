import { ActionPanel, Icon, List, Action } from "@raycast/api";
import { Domain, Team } from "../../types";
import SearchBarAccessory from "../search-projects/team-switch-search-accessory";
import useVercel from "../../hooks/use-vercel-info";
import { getFetchDomainsURL } from "../../vercel";
import { getFavicon, useFetch } from "@raycast/utils";
import { FetchHeaders } from "../../vercel";

const DomainListSection = () => {
  const { selectedTeam, user, teams } = useVercel();
  const url = getFetchDomainsURL(selectedTeam);

  const {
    isLoading,
    data: domains,
    revalidate,
  } = useFetch(url, {
    headers: FetchHeaders,
    mapResult(result: { domains: Domain[] }) {
      return {
        data: result.domains,
      };
    },
    initialData: [],
  });

  const onTeamChange = () => {
    revalidate();
  };

  const getVercelDomainUrl = (domainName: string) => {
    const teamSlug = teams?.find((team: Team) => team.id === selectedTeam)?.slug;
    const ownerSlug = teamSlug || user?.username;
    return `https://vercel.com/${ownerSlug}/~/domains/${domainName}`;
  };

  return (
    <List
      searchBarPlaceholder="Search Domains..."
      navigationTitle="Results"
      isLoading={isLoading}
      searchBarAccessory={<>{user && <SearchBarAccessory onTeamChange={onTeamChange} />}</>}
    >
      {domains.map((domain) => (
        <List.Item
          key={domain.id}
          id={domain.id}
          icon={getFavicon(`https://${domain.name}`, { fallback: Icon.Dot })}
          title={domain.name}
          subtitle={domain.serviceType === "external" ? "Third Party" : domain.serviceType}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title={`Visit ${domain.name}`} url={`https://${domain.name}`} />
              {domain.serviceType === "zeit.world" && (
                <Action.OpenInBrowser
                  title="Visit on Vercel"
                  url={getVercelDomainUrl(domain.name)}
                  icon={Icon.Globe}
                  shortcut={{
                    macOS: { modifiers: ["cmd", "opt"], key: "v" },
                    Windows: { modifiers: ["ctrl", "opt"], key: "v" },
                  }}
                />
              )}
            </ActionPanel>
          }
          accessories={[
            {
              date: new Date(domain.createdAt),
            },
          ]}
        />
      ))}
    </List>
  );
};

export default DomainListSection;
