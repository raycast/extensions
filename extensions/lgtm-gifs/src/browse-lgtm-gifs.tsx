import { ActionPanel, Action, Icon, Grid, Color, showToast, Toast, Clipboard, closeMainWindow } from "@raycast/api";
import { LGTM_GIFS, CATEGORIES, type LGTMGif, type Category } from "../lib/gifs";
import { useState } from "react";

export default function Command() {
  const [columns, setColumns] = useState(3);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category>("All");

  const filteredGifs = LGTM_GIFS.filter((gif) => {
    const matchesSearch = searchText === "" || gif.title.toLowerCase().includes(searchText.toLowerCase());

    const matchesCategory = selectedCategory === "All" || gif.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  async function copyGifAsMarkdown(gif: LGTMGif): Promise<void> {
    const markdown = `![${gif.title}](${gif.url})`;
    await Clipboard.copy(markdown);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to clipboard!",
      message: `${gif.title} ready to paste as markdown`,
    });
    await closeMainWindow();
  }

  async function copyGifUrl(gif: LGTMGif): Promise<void> {
    await Clipboard.copy(gif.url);
    await showToast({
      style: Toast.Style.Success,
      title: "GIF URL copied!",
      message: gif.title,
    });
    await closeMainWindow();
  }

  return (
    <Grid
      columns={columns}
      inset={Grid.Inset.Large}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search LGTM GIFs..."
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Filter by Category"
          storeValue
          onChange={(newValue) => setSelectedCategory(newValue as Category)}
        >
          {CATEGORIES.map((category) => (
            <Grid.Dropdown.Item key={category} title={category} value={category} />
          ))}
        </Grid.Dropdown>
      }
      navigationTitle="Browse LGTM GIFs"
    >
      <Grid.Section title={`${filteredGifs.length} GIFs`}>
        {filteredGifs.map((gif) => (
          <Grid.Item
            key={gif.id}
            content={{
              value: gif.url,
              tooltip: gif.title,
            }}
            title={gif.title}
            subtitle={gif.category}
            actions={
              <ActionPanel>
                <Action title="Copy as Markdown" icon={Icon.Clipboard} onAction={() => copyGifAsMarkdown(gif)} />
                <Action title="Copy Gif URL" icon={Icon.Link} onAction={() => copyGifUrl(gif)} />
                <Action.OpenInBrowser title="Open in Browser" url={gif.url} icon={Icon.Globe} />
                <Action
                  title="Toggle Grid Size"
                  icon={Icon.Cog}
                  onAction={() => {
                    const newColumns = columns === 3 ? 5 : columns === 5 ? 8 : 3;
                    setColumns(newColumns);
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "g" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </Grid.Section>

      {filteredGifs.length === 0 && (
        <Grid.Item
          content={{
            value: {
              source: Icon.MagnifyingGlass,
              tintColor: Color.SecondaryText,
            },
            tooltip: "No results found",
          }}
          title="No GIFs found"
          subtitle="Try a different search term or category"
        />
      )}
    </Grid>
  );
}
