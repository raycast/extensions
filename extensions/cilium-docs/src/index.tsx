import { ActionPanel, Action, List } from "@raycast/api";
import axios from "axios";
import cheerio from "cheerio";
import { useEffect, useState } from "react"; // Import useState and useEffect

export default function Command() {
  const websiteUrl: string = "https://docs.cilium.io/en/stable/";
  const navigationClass: string = "wy-nav-side";

  // Initialize state to store the fetched items
  const [items, setItems] = useState<{ key: number; title: string; link: string }[]>([]);

  useEffect(() => {
    axios
      .get(websiteUrl)
      .then((response) => {
        const $ = cheerio.load(response.data);

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

        // Update the state with the fetched items
        setItems(fetchedItems);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });
  }, []); // The empty dependency array ensures this effect runs only once when the component mounts

  return (
    <List>
      {items.map((item) => (
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
