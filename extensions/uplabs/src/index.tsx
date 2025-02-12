import React from "react";
import { ActionPanel, Detail, Action, Grid, Color } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { fetchMetadata, fetchPosts, UpLabsPost } from "./data";

const createShotMarkdown = (item: UpLabsPost) => {
  return `## ${item.title}

![Illustration](${item.image})`;
};

export default function Command() {
  const [filter, setFilter] = React.useState("https://www.uplabs.com");
  const { data: sections } = useCachedPromise(fetchMetadata);
  const { isLoading, data: items = [] } = usePromise(fetchPosts, [filter]);

  return (
    <Grid
      columns={3}
      aspectRatio="4/3"
      fit={Grid.Fit.Fill}
      isLoading={isLoading}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Filter" value={filter} onChange={setFilter}>
          <Grid.Dropdown.Item title="🔥 Trending" value="https://www.uplabs.com" />
          {sections?.map((section) => (
            <Grid.Dropdown.Section title={section.title} key={section.title}>
              {section.items.map((item) => (
                <Grid.Dropdown.Item title={item.label} value={item.url} key={item.url} />
              ))}
            </Grid.Dropdown.Section>
          ))}
        </Grid.Dropdown>
      }
    >
      {items.map((item) => (
        <Grid.Item
          key={item.icon}
          content={{ tooltip: item.title, value: { source: item.image } }}
          title={item.title}
          keywords={item.tools.map((t) => t.friendly_name)}
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
                        <Detail.Metadata.TagList title="Tools">
                          {item.tools.map((tool) => (
                            <Detail.Metadata.TagList.Item key={tool.name} text={tool.friendly_name} />
                          ))}
                        </Detail.Metadata.TagList>
                        <Detail.Metadata.TagList title="Price">
                          <Detail.Metadata.TagList.Item text={`Default: $${item.default_price}`} color={Color.Green} />
                          {item.commercial_price && (
                            <Detail.Metadata.TagList.Item
                              text={`Commercial: $${item.commercial_price}`}
                              color={Color.Blue}
                            />
                          )}
                          {item.extended_price && (
                            <Detail.Metadata.TagList.Item
                              text={`Extended: $${item.extended_price}`}
                              color={Color.Red}
                            />
                          )}
                        </Detail.Metadata.TagList>
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
              <Action.OpenInBrowser title="Open Download page in Browser" url={item.download_link} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
