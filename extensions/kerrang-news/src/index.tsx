import { ActionPanel, Action, List, Image, Icon } from '@raycast/api';
import { useFetch } from '@raycast/utils';

interface Feed {
  items: NewsItem[];
}

interface NewsItem {
  id: string;
  url: string;
  title: string;
  content_text?: string;
  image?: string;
  date_published: string;
}

export default function Command() {
  const { isLoading, data } = useFetch<Feed>('https://rss.app/feeds/v1.1/nhqzn9qrR5rCbxCF.json');

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Kerrang! news...">
      {data?.items.map((item) => (
        <List.Item
          key={item.id}
          icon={item.image ? { source: item.image, mask: Image.Mask.RoundedRectangle } : Icon.Globe}
          title={item.title}
          subtitle={new Date(item.date_published).toLocaleDateString()}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={item.url} />
              <Action.CopyToClipboard content={item.url} title="Copy URL" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
