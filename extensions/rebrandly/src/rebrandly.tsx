import { ActionPanel, Icon, List, Action } from "@raycast/api";
import { useGetLinks } from "./hooks";
import { getFavicon } from "@raycast/utils";

export default function Rebrandly() {
  const { isLoading, data: links, pagination } = useGetLinks();
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search by title or slashtag" throttle pagination={pagination}>
      <List.Section title={`${links.length} Links`}>
        {links.map((link) => {
          const url = `${link.https ? "https" : "http"}://${link.shortUrl}`;
          return (
            <List.Item
              key={link.id}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={url} />
                  <Action.CopyToClipboard content={url} />
                </ActionPanel>
              }
              icon={getFavicon(link.destination)}
              id={link.id}
              keywords={[link.title, link.shortUrl, link.slashtag]}
              title={link.title.length > 48 ? `${link.title.substr(0, 48)}...` : link.title}
              subtitle={link.shortUrl}
              accessories={[
                link.favourite ? { icon: Icon.Star } : {},
                { text: `${link.clicks} clicks` },
                { date: new Date(link.createdAt) },
              ]}
            />
          );
        })}
      </List.Section>
    </List>
  );
}
