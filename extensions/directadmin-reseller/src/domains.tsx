import { useEffect, useState } from "react";
import { getDomains } from "./utils/api";
import { ErrorResponse, GetDomainsResponse } from "./types";
import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import CreateNewDomainComponent from "./components/CreateNewDomainComponent";
import GetSubdomainsComponent from "./components/subdomains/GetSubdomainsComponent";
import GetEmailAccountsComponent from "./components/email-accounts/GetEmailAccountsComponent";
import ErrorComponent from "./components/ErrorComponent";

export default function Domains() {
  const [isLoading, setIsLoading] = useState(true);
  const [domains, setDomains] = useState<string[]>();
  const [error, setError] = useState<ErrorResponse>();

  async function getFromApi() {
    setIsLoading(true);
    const response = await getDomains();

    if (response.error === "0") {
      const data = response as GetDomainsResponse;
      const { list } = data;
      setDomains(list);
      await showToast(Toast.Style.Success, "SUCCESS", `Fetched ${list.length} Domains`);
    } else if (response.error === "1") setError(response as ErrorResponse);
    setIsLoading(false);
  }

  useEffect(() => {
    getFromApi();
  }, []);

  return error ? (
    <ErrorComponent errorResponse={error} />
  ) : (
    <List isLoading={isLoading}>
      {domains &&
        domains.map((domain) => (
          <List.Item
            key={domain}
            title={domain}
            icon={getFavicon(`https://${domain}`, { fallback: Icon.Globe })}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Get Subdomains"
                  icon={Icon.Globe}
                  target={<GetSubdomainsComponent domain={domain} />}
                />
                <Action.Push
                  title="Get Email Accounts"
                  icon={Icon.AtSymbol}
                  target={<GetEmailAccountsComponent domain={domain} />}
                />
                <ActionPanel.Section>
                  <Action.Push
                    title="Create Domain"
                    icon={Icon.Plus}
                    target={<CreateNewDomainComponent onDomainCreated={getFromApi} />}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      {!isLoading && (
        <List.Section title="Actions">
          <List.Item
            title="Create Domain"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Create Domain"
                  icon={Icon.Plus}
                  target={<CreateNewDomainComponent onDomainCreated={getFromApi} />}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
