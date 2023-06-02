import { Action, ActionPanel, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useEffect, useState } from "react";
import { getDomains } from "./utils/api";
import { DomainsRequestParameters, DomainsResponse } from "./utils/types";
import { API_DOMAIN } from "./utils/constants";
import PageOptionsForm from "./components/PageOptionsForm";

export default function Domains() {
  const { push } = useNavigation();
  const handleOptionsSelected = (page_size: string, page: string) =>
    push(<DomainsList page_size={page_size} page={page} />);
  return <PageOptionsForm onOptionsSelected={handleOptionsSelected} />;
}

function DomainsList({ page_size, page }: DomainsRequestParameters) {
  const [isLoading, setIsLoading] = useState(false);
  const [domains, setDomains] = useState<DomainsResponse>();

  async function getDomainsFromApi() {
    setIsLoading(true);
    const response = await getDomains({ page_size, page });
    if (!("error" in response)) {
      const numOfDomains = response.domains.length;
      await showToast({
        title: "Success",
        message: `Fetched ${numOfDomains} ${numOfDomains === 1 ? "domain" : "domains"}`,
        style: Toast.Style.Success,
      });
      setDomains(response);
    }
    setIsLoading(false);
  }
  useEffect(() => {
    getDomainsFromApi();
  }, []);

  const title =
    domains &&
    `Entries: ${domains.domains.length}/${domains.total_entries} | Pages: ${domains.page_number}/${domains.total_pages}`;
  return !domains ? null : (
    <List isLoading={isLoading} searchBarPlaceholder="Search domain">
      {domains.domains.length === 0 ? (
        <List.EmptyView
          title="No domains with valid DNS records found."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Go To Domains" icon={Icon.Globe} url={API_DOMAIN + "domains"} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          <List.Section title={title}>
            {domains.domains.map((domainItem) => (
              <List.Item
                key={domainItem.domain}
                title={domainItem.domain}
                icon={getFavicon(`https://${domainItem.domain}`, { fallback: "Shroud.email.png" })}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser url={API_DOMAIN + `domains/${domainItem.domain}`} icon={Icon.Globe} />
                    <Action.CopyToClipboard content={domainItem.domain} />
                    <Action title="Reload Domains" icon={Icon.Redo} onAction={getDomainsFromApi} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
          {!isLoading && (
            <List.Section title="Actions">
              <List.Item
                title="Reload Domains"
                icon={Icon.Redo}
                actions={
                  <ActionPanel>
                    <Action title="Reload Domains" icon={Icon.Redo} onAction={getDomainsFromApi} />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
