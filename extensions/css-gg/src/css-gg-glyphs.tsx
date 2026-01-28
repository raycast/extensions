import { Grid, ActionPanel, Action, Image, Cache } from "@raycast/api";
import { useState, useEffect } from "react";
import { getAvatarIcon } from "@raycast/utils";
import { v4 as uuidv4 } from "uuid";
import * as glyphsData from "css.gg/glyphs/glyphs.json";

interface Icon {
  name: string;
  symbol: string;
  unicode?: string;
  html_entity?: string;
}

interface Category {
  slug: string;
  title: string;
  description: string;
  symbols: Icon[];
}

interface ApiResponse {
  categories: {
    category: Category[];
  };
}

export default function Glyphs() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("featured");

  useEffect(() => {
    const cache = new Cache();
    const cachedResponse = cache.get("glyphs");

    if (cachedResponse) {
      setCategories(JSON.parse(cachedResponse));
    } else {
      const apiResponse = glyphsData as ApiResponse;
      setCategories(apiResponse.categories.category);
      cache.set("glyphs", JSON.stringify(apiResponse.categories.category));
    }
  }, []);

  const getSymbolUrl = (symbol: Icon) => `https://glyf.app/${encodeURIComponent(symbol.name.toLowerCase())}`;

  const sections = categories
    .filter((category) => selectedCategory === "all" || category.slug === selectedCategory)
    .map((category) => {
      const subtitle = `${category.symbols.length} ${category.symbols.length === 1 ? "symbol" : "symbols"}`;

      return (
        <Grid.Section key={uuidv4()} title={category.title} subtitle={subtitle}>
          {category.symbols.map((symbol) => {
            const key = uuidv4();

            const decorator = getAvatarIcon(symbol.symbol, { background: "#00000000", gradient: false });
            const content = {
              tooltip: symbol.name,
              value: {
                source: decorator,
                tintColor: {
                  light: "#000000",
                  dark: "#ffffff",
                  adjustContrast: true,
                },
              },
            };

            return (
              <Grid.Item
                key={key}
                keywords={[symbol.name]}
                content={content}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Options">
                      <Action.Paste content={symbol.symbol} />
                      <Action.CopyToClipboard
                        title="Copy to Clipboard"
                        content={symbol.symbol}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                      <Action.OpenInBrowser
                        url={getSymbolUrl(symbol)}
                        shortcut={{ modifiers: ["shift"], key: "enter" }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Author">
                      <Action.OpenInBrowser
                        title="Astrit"
                        icon={{ source: "https://github.com/astrit.png", mask: Image.Mask.Circle }}
                        url="https://github.com/astrit"
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </Grid.Section>
      );
    });

  const categoryItems = categories
    .sort((a, b) => {
      if (a.title === "featured") {
        return -1;
      } else if (b.title === "featured") {
        return 1;
      } else {
        return a.title.localeCompare(b.title);
      }
    })
    .map((category) => ({
      title: category.title,
      value: category.slug,
    }));

  return (
    <Grid
      navigationTitle="Search Glyphs"
      inset={Grid.Inset.Large}
      columns={8}
      searchBarPlaceholder="Search glyphs e.g apple"
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select Category"
          defaultValue="featured"
          onChange={(value) => setSelectedCategory(value)}
        >
          <Grid.Dropdown.Section title="Categories">
            <Grid.Dropdown.Item key="glyphs-all" title="All" value="all" />
            {categoryItems.map((item) => (
              <Grid.Dropdown.Item key={item.title} {...item} />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {sections}
    </Grid>
  );
}
