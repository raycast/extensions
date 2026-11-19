import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import CreateNewDomainComponent from "./components/CreateNewDomainComponent";
import GetSubdomainsComponent from "./components/subdomains/GetSubdomainsComponent";
import GetEmailAccountsComponent from "./components/email-accounts/GetEmailAccountsComponent";
import ErrorComponent from "./components/ErrorComponent";
import InvalidUrlComponent from "./components/InvalidUrlComponent";
import { isInvalidUrl } from "./utils/functions";
import { useGetDomains } from "./utils/hooks";
import { Panel } from "./types/panel";

export default function Domains({ panel }: { panel?: Panel }) {
  if (isInvalidUrl()) return <InvalidUrlComponent />;

  const { isLoading, data: domains, error, revalidate } = useGetDomains(panel);

  return error ? (
    <ErrorComponent errorResponse={error} />
  ) : (
    <List isLoading={isLoading} searchBarPlaceholder="Search domain">
      {domains?.map((domain) => (
        <List.Item
          key={domain}
          title={domain}
          icon={getFavicon(`https://${domain}`, { fallback: Icon.Globe })}
          actions={
            <ActionPanel>
              <Action.Push
                title="Get Subdomains"
                icon={Icon.Globe}
                target={<GetSubdomainsComponent domain={domain} panel={panel} />}
              />
              <Action.Push
                title="Get Email Accounts"
                icon={Icon.AtSymbol}
                target={<GetEmailAccountsComponent domain={domain} panel={panel} />}
              />
              {!panel && (
                <ActionPanel.Section>
                  <Action.Push
                    title="Create Domain"
                    icon={Icon.Plus}
                    target={<CreateNewDomainComponent onDomainCreated={revalidate} />}
                  />
                </ActionPanel.Section>
              )}
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && (
        <List.Section title="Actions">
          {!panel && (
            <List.Item
              title="Create Domain"
              icon={Icon.Plus}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Create Domain"
                    icon={Icon.Plus}
                    target={<CreateNewDomainComponent onDomainCreated={revalidate} />}
                  />
                </ActionPanel>
              }
            />
          )}
        </List.Section>
      )}
    </List>
  );
}
