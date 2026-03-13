import { ActionPanel, Action, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import cheerio from "cheerio";

export default function Command() {
  const websiteUrl: string = "https://docs.cilium.io/en/stable/";
  const navigationClass: string = "wy-nav-side";

  const { data, isLoading } = useFetch(websiteUrl, {
    async parseResponse(response) {
      if (!response.ok) {
        throw new Error(`Failed to fetch feed: ${response.statusText}`);
      }

      const $ = cheerio.load(await response.text());

      // Find the navigation element by class name
      const navigation = $(`.${navigationClass}`);

      let keyCounter: number = 0;

      // Extract items from the navigation
      const fetchedItems: { key: number; title: string; link: string }[] = [];

      navigation.find("li").each((index, element) => {
        const link = $(element).find("a");
        const title: string = link.text();
        const href: string | undefined = link.attr("href");

        if (title && href) {
          fetchedItems.push({ key: keyCounter, title, link: websiteUrl + (href || "") });
        }
        keyCounter++;
      });

      return fetchedItems;
    },
  });

  return (
    <List isLoading={isLoading}>
      {data?.map((item) => (
        <List.Item
          key={item.key}
          icon="list-icon.png"
          title={item.title}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={item.link} />
              <Action.CopyToClipboard content={item.link} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
