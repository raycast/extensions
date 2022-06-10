import React from "react";
import { ActionPanel, Detail, Action, Grid, Color } from "@raycast/api";
import { fetchShots, Shot } from "./data";

const createShotMarkdown = (item: Shot) => {
  return `## ${item.title}

![Illustration](${item.image})`;
};

export default function Command() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [filter, setFilter] = React.useState("recent");
  const [items, setItems] = React.useState<Shot[]>([]);

  React.useEffect(() => {
    setIsLoading(true);
    setItems([]);
    fetchShots(filter)
      .then(setItems)
      .then(() => setIsLoading(false))
      .catch(() => setIsLoading(false));
  }, [filter]);

  return (
    <Grid
      itemSize={Grid.ItemSize.Large}
      isLoading={isLoading}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Filter" value={filter} onChange={setFilter}>
          <Grid.Dropdown.Section title="Recent">
            <Grid.Dropdown.Item title="All" value="recent" />
            <Grid.Dropdown.Item title="Animation" value="recent/animation" />
            <Grid.Dropdown.Item title="Branding" value="recent/branding" />
            <Grid.Dropdown.Item title="Illustration" value="recent/illustration" />
            <Grid.Dropdown.Item title="Mobile" value="recent/mobile" />
            <Grid.Dropdown.Item title="Print" value="recent/print" />
            <Grid.Dropdown.Item title="Product Design" value="recent/product-design" />
            <Grid.Dropdown.Item title="Typography" value="recent/typography" />
            <Grid.Dropdown.Item title="Web Design" value="recent/web-design" />
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section title="Popular">
            <Grid.Dropdown.Item title="All" value="popular" />
            <Grid.Dropdown.Item title="Animation" value="popular/animation" />
            <Grid.Dropdown.Item title="Branding" value="popular/branding" />
            <Grid.Dropdown.Item title="Illustration" value="popular/illustration" />
            <Grid.Dropdown.Item title="Mobile" value="popular/mobile" />
            <Grid.Dropdown.Item title="Print" value="popular/print" />
            <Grid.Dropdown.Item title="Product Design" value="popular/product-design" />
            <Grid.Dropdown.Item title="Typography" value="popular/typography" />
            <Grid.Dropdown.Item title="Web Design" value="popular/web-design" />
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section title="Goods">
            <Grid.Dropdown.Item title="All" value="goods" />
            <Grid.Dropdown.Item title="Apparel" value="goods/apparel" />
            <Grid.Dropdown.Item title="Prints" value="goods/prints" />
            <Grid.Dropdown.Item title="Icons" value="goods/icons" />
            <Grid.Dropdown.Item title="Fonts" value="goods/fonts" />
            <Grid.Dropdown.Item title="Illustrations" value="goods/illustrations" />
            <Grid.Dropdown.Item title="Patterns" value="goods/patterns" />
            <Grid.Dropdown.Item title="Mockups" value="goods/mockups" />
            <Grid.Dropdown.Item title="Textures" value="goods/textures" />
            <Grid.Dropdown.Item title="Logos" value="goods/logos" />
            <Grid.Dropdown.Item title="Extensions" value="goods/extensions" />
            <Grid.Dropdown.Item title="Themes" value="goods/themes" />
            <Grid.Dropdown.Item title="Apps" value="goods/apps" />
            <Grid.Dropdown.Item title="Other" value="goods/other" />
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {items.map((item) => (
        <Grid.Item
          key={item.icon}
          content={{ tooltip: item.title, value: { source: item.image } }}
          title={`${item.title}`}
          actions={
            <ActionPanel>
              <Action.Push
                title="More Info"
                icon={{
                  source: "info.svg",
                  tintColor: {
                    light: "#000",
                    dark: "#FFF",
                  },
                }}
                target={
                  <Detail
                    markdown={createShotMarkdown(item)}
                    metadata={
                      <Detail.Metadata>
                        {item.author?.link && item.author?.title && (
                          <Detail.Metadata.Link title="Author" target={item.author?.link} text={item.author?.title} />
                        )}
                        <Detail.Metadata.Separator />
                        <Detail.Metadata.TagList title="Statistics">
                          <Detail.Metadata.TagList.Item text={`❤️ ${item.likes}`} color={Color.Red} />
                          <Detail.Metadata.TagList.Item text={`👁 ${item.views}`} color={Color.PrimaryText} />
                        </Detail.Metadata.TagList>
                      </Detail.Metadata>
                    }
                    actions={
                      <ActionPanel>
                        <Action.OpenInBrowser title="Open in Browser" url={item.link} />
                        {item?.author?.link && (
                          <Action.OpenInBrowser title="Open Author in Browser" url={item.author.link} />
                        )}
                      </ActionPanel>
                    }
                  />
                }
              />
              <Action.OpenInBrowser title="Open in Browser" url={item.link} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
