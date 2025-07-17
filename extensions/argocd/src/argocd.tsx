import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";

interface ListItem {
  id: number;
  icon: Icon;
  title: string;
  subtitle: string;
  accessory: string;
  url: string;
}

interface State {
  items: ListItem[];
  error?: Error;
  isLoading: boolean;
}

interface Account {
  account_id: number;
  primary_region: string;
  cloud_provider: string;
  environment: string;
  primary_workload: string;
  name: string;
  alias: string;
  platform_dns_domain: string;
}

interface AccountData {
  account_list: Account[];
}

function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (text) => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase());
}

const METADATA_SERVICE_URL =
  "https://metadata.ktl.net/api/infra/v1/accounts?primary_workload=field&primary_workload=customer";

export default function Command() {
  const [state, setState] = useState<State>({ items: [], isLoading: true });

  useEffect(() => {
    async function fetchAccounts() {
      try {
        const response = await fetch(METADATA_SERVICE_URL);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: AccountData = await response.json();
        const items: ListItem[] = data.account_list.map((account: Account) => ({
          id: account.account_id,
          icon: Icon.Cloud,
          title: toTitleCase(account.alias) || "Unknown Account",
          accessory: account.account_id.toString(),
          url: `https://cd.${account.platform_dns_domain}`,
        }));
        setState({ items: items, isLoading: false });
      } catch (error) {
        console.error("Error fetching metadata:", error);
        setState({
          items: [],
          error: error instanceof Error ? error : new Error("Unknown error"),
          isLoading: false,
        });
      }
    }

    fetchAccounts();
  }, []);
  return (
    <List isLoading={state.isLoading}>
      {state.error ? (
        <List.EmptyView icon={Icon.Warning} title="Error" description={state.error.message} />
      ) : (
        state.items.map((item) => (
          <List.Item
            key={item.id}
            icon={item.icon}
            title={item.title}
            subtitle=""
            accessories={[{ text: item.accessory }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={item.url} />
                <Action.CopyToClipboard content={item.title} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
