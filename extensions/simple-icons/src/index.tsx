import { useState } from "react";
import { ActionPanel, Action, Grid, Icon, Detail } from "@raycast/api";
import * as simpleIcons from "simple-icons";
import packageJson from "../package.json";

export default function Command() {
  const [itemSize, setItemSize] = useState<Grid.ItemSize>(Grid.ItemSize.Small);
  const [isLoading, setIsLoading] = useState(true);

  return (
    <Grid
      itemSize={itemSize}
      inset={Grid.Inset.Small}
      isLoading={isLoading}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Grid Item Size"
          storeValue
          onChange={(newValue) => {
            setItemSize(newValue as Grid.ItemSize);
            setIsLoading(false);
          }}
        >
          <Grid.Dropdown.Item title="Small" value={Grid.ItemSize.Small} />
          <Grid.Dropdown.Item title="Medium" value={Grid.ItemSize.Medium} />
          <Grid.Dropdown.Item title="Large" value={Grid.ItemSize.Large} />
        </Grid.Dropdown>
      }
    >
      {!isLoading &&
        Object.entries(simpleIcons).map(([name, icon]) => (
          <Grid.Item
            key={name}
            content={{ value: { source: `icons/${icon.slug}.svg`, tintColor: Color.PrimaryText }, tooltip: name }}
            title={icon.title}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Eye}
                  title="See Detail"
                  target={
                    <Detail
                      markdown={`<img src="icons/${icon.slug}.svg?raycast-width=325&raycast-height=325"/>`}
                      navigationTitle={icon.title}
                      metadata={
                        <Detail.Metadata>
                          <Detail.Metadata.Label title="Title" text={icon.title} />
                          <Detail.Metadata.Label title="Slug" text={icon.slug} />
                          <Detail.Metadata.TagList title="Brand color">
                            <Detail.Metadata.TagList.Item text={icon.hex} color={`#${icon.hex}`} />
                          </Detail.Metadata.TagList>
                          <Detail.Metadata.Separator />
                          <Detail.Metadata.Link title="Source" target={icon.source} text={icon.source} />
                          {icon.guidelines && (
                            <Detail.Metadata.Link title="Guidelines" target={icon.guidelines} text={icon.guidelines} />
                          )}
                          {icon.license && (
                            <Detail.Metadata.Link
                              title="License"
                              target={icon.license.url as string}
                              text={icon.license.type === "custom" ? (icon.license.url as string) : icon.license.type}
                            />
                          )}
                        </Detail.Metadata>
                      }
                      actions={
                        <ActionPanel>
                          <Action.CopyToClipboard title="Copy SVG" content={icon.svg} />
                          <Action.CopyToClipboard title="Copy Color" content={icon.hex} />
                          <Action.CopyToClipboard
                            title="Copy Slug"
                            content={icon.slug}
                            shortcut={{ modifiers: ["opt"], key: "enter" }}
                          />
                          <Action.CopyToClipboard
                            title="Copy CDN Link"
                            content={`https://cdn.simpleicons.org/${icon.slug}`}
                            shortcut={{ modifiers: ["shift"], key: "enter" }}
                          />
                          <Action.CopyToClipboard
                            title="Copy jsDelivr CDN Link"
                            content={`https://cdn.jsdelivr.net/npm/simple-icons@${packageJson.dependencies["simple-icons"]}/icons/${icon.slug}.svg`}
                          />
                          <Action.CopyToClipboard
                            // eslint-disable-next-line @raycast/prefer-title-case
                            title="Copy unpkg CDN Link"
                            content={`https://unpkg.com/simple-icons@${packageJson.dependencies["simple-icons"]}/icons/${icon.slug}.svg`}
                          />
                        </ActionPanel>
                      }
                    />
                  }
                />
              </ActionPanel>
            }
          />
        ))}
    </Grid>
  );
}
