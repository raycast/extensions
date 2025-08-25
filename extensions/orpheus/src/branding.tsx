import { useEffect, useState } from "react";
import { Grid, Clipboard, showToast, Toast, ActionPanel, Action } from "@raycast/api";

const items = [
  { content: "https://assets.hackclub.com/flag-orpheus-top.svg", keywords: ["flag", "orpheus", "logo"] },
  { content: "https://assets.hackclub.com/flag-orpheus-left.svg", keywords: ["flag", "orpheus", "logo"] },
  { content: "https://assets.hackclub.com/flag-standalone.svg", keywords: ["flag", "standalone", "logo"] },
  { content: "https://assets.hackclub.com/flag-orpheus-top-bw.svg", keywords: ["flag", "orpheus", "black-and-white"] },
  { content: "https://assets.hackclub.com/flag-orpheus-left-bw.svg", keywords: ["flag", "orpheus", "black-and-white"] },
  {
    content: "https://assets.hackclub.com/flag-standalone-bw.svg",
    keywords: ["flag", "standalone", "black-and-white"],
  },
  {
    content: "https://assets.hackclub.com/flag-standalone-wtransparent.svg",
    keywords: ["flag", "standalone", "transparent"],
  },

  { content: "https://assets.hackclub.com/icon-rounded.svg", keywords: ["icon", "rounded", "logo"] },
  { content: "https://assets.hackclub.com/icon-square.svg", keywords: ["icon", "square", "logo"] },
  { content: "https://assets.hackclub.com/icon-progress-rounded.svg", keywords: ["icon", "progress", "rounded"] },
  { content: "https://assets.hackclub.com/icon-progress-square.svg", keywords: ["icon", "progress", "square"] },

  { content: "https://assets.hackclub.com/hcb-light.svg", keywords: ["logo", "hcb", "hack club bank", "light"] },
  { content: "https://assets.hackclub.com/hcb-dark.svg", keywords: ["logo", "hcb", "hack club bank", "dark"] },
  { content: "https://assets.hackclub.com/hack-club-bank-light.svg", keywords: ["logo", "hack club bank", "light"] },
  { content: "https://assets.hackclub.com/hack-club-bank-dark.svg", keywords: ["logo", "hack club bank", "dark"] },

  { content: "https://assets.hackclub.com/banners/2025.svg", keywords: ["banner", "2025", "brand"] },
];

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [filteredList, filterList] = useState(items);

  useEffect(() => {
    filterList(items.filter((item) => item.keywords.some((keyword) => keyword.includes(searchText))));
  }, [searchText]);

  const handleItemClick = async (url: string) => {
    await Clipboard.copy(url);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to clipboard",
      message: url,
    });
  };

  return (
    <Grid
      columns={5}
      inset={Grid.Inset.Large}
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search "
      searchBarPlaceholder="Search across HC branding"
    >
      {filteredList.map((item) => (
        <Grid.Item
          key={item.content}
          content={item.content}
          actions={
            <ActionPanel>
              <Action title="Copy to Clipboard" onAction={() => handleItemClick(item.content)} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
