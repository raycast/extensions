import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useEffect, useState } from "react";
import { getDomains } from "./utils/api";
import { DomainsRequestParameters, DomainsResponse } from "./utils/types";
import { API_DOMAIN } from "./utils/constants";

export default function Domains() {
  const [isLoading, setIsLoading] = useState(true);
  const [domainsResponse, setDomainsResponse] = useState<DomainsResponse>();

  async function getDomainsFromApi() {
    setIsLoading(true);
    const parameters: DomainsRequestParameters = { page_size: "9999", page: "1" };
    const response = await getDomains(parameters);
    if (!("error" in response)) {
      const numOfDomains = response.domains.length;
      await showToast({
        title: "Success",
        message: `Fetched ${numOfDomains} ${numOfDomains === 1 ? "domain" : "domains"}`,
        style: Toast.Style.Success,
      });
      setDomainsResponse(response);
    }
    setIsLoading(false);
  }
  useEffect(() => {
    getDomainsFromApi();
  }, []);

  const numOfDomains = domainsResponse && domainsResponse.domains.length;
  const title = domainsResponse && `${numOfDomains} ${numOfDomains === 1 ? "domain" : "domains"}`;
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search domain">
      {domainsResponse?.domains.length === 0 ? (
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
            {domainsResponse?.domains.map((domainItem) => (
              <List.Item
                key={domainItem.domain}
                title={domainItem.domain}
                icon={getFavicon(`https://${domainItem.domain}`, { fallback: "shroud-email.png" })}
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
