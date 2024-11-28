import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import ListItemDetailComponent from "./ListItemDetailComponent";
import { getMailDomains } from "../utils/hestia";

type ListMailDomainsComponentProps = {
  user: string;
};
export default function ListMailDomainsComponent({ user }: ListMailDomainsComponentProps) {
  const { isLoading, data: domains } = getMailDomains(user);

  return (
    <List isLoading={isLoading} isShowingDetail navigationTitle={`Users / ${user} / Mail Domains`}>
      {domains &&
        Object.entries(domains).map(([domain, data]) => (
          <List.Item
            key={domain}
            title={domain}
            icon={getFavicon(`${data.SSL === "yes" ? "https" : "http"}://${domain}`, { fallback: Icon.Globe })}
            detail={<ListItemDetailComponent data={data} />}
            accessories={[
              { icon: { source: Icon.Dot, tintColor: data.SUSPENDED === "yes" ? Color.Red : Color.Green } },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy to Clipboard as JSON"
                  icon={Icon.Clipboard}
                  content={JSON.stringify(data)}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
