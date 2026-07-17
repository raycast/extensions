import { Action, ActionPanel, List } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { getStats } from "./api";

export default function ListLinks() {
  const { isLoading, data: links } = useCachedPromise(
    async () => {
      const res = await getStats({ limit: "9999" });
      return Object.values(res.links);
    },
    [],
    {
      initialData: [],
    },
  );
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search links">
      {links.map((link) => (
        <List.Item
          key={link.shorturl}
          icon={getFavicon(link.url)}
          title={link.title}
          subtitle={`${link.url} -> ${link.shorturl}`}
          accessories={[{ date: new Date(link.timestamp) }, { text: `${link.clicks} clicks` }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Short URL" content={link.shorturl} />
              <Action.CopyToClipboard title="Copy Long URL" content={link.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
