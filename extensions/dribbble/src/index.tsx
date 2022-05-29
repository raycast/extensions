import React from "react";
import { ActionPanel, List, Action } from "@raycast/api";
import { fetchShots, Shot } from "./data";

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
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" value={filter} onChange={setFilter}>
          <List.Dropdown.Section title="Recent">
            <List.Dropdown.Item title="All | Recent" value="recent" />
            <List.Dropdown.Item title="Animation | Recent" value="recent/animation" />
            <List.Dropdown.Item title="Branding | Recent" value="recent/branding" />
            <List.Dropdown.Item title="Illustration | Recent" value="recent/illustration" />
            <List.Dropdown.Item title="Mobile | Recent" value="recent/mobile" />
            <List.Dropdown.Item title="Print | Recent" value="recent/print" />
            <List.Dropdown.Item title="Product Design | Recent" value="recent/product-design" />
            <List.Dropdown.Item title="Typography | Recent" value="recent/typography" />
            <List.Dropdown.Item title="Web Design | Recent" value="recent/web-design" />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Popular">
            <List.Dropdown.Item title="All | Popular" value="popular" />
            <List.Dropdown.Item title="Animation | Popular" value="popular/animation" />
            <List.Dropdown.Item title="Branding | Popular" value="popular/branding" />
            <List.Dropdown.Item title="Illustration | Popular" value="popular/illustration" />
            <List.Dropdown.Item title="Mobile | Popular" value="popular/mobile" />
            <List.Dropdown.Item title="Print | Popular" value="popular/print" />
            <List.Dropdown.Item title="Product Design | Popular" value="popular/product-design" />
            <List.Dropdown.Item title="Typography | Popular" value="popular/typography" />
            <List.Dropdown.Item title="Web Design | Popular" value="popular/web-design" />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Goods">
            <List.Dropdown.Item title="All | Goods" value="goods" />
            <List.Dropdown.Item title="Apparel | Goods" value="goods/apparel" />
            <List.Dropdown.Item title="Prints | Goods" value="goods/prints" />
            <List.Dropdown.Item title="Icons | Goods" value="goods/icons" />
            <List.Dropdown.Item title="Fonts | Goods" value="goods/fonts" />
            <List.Dropdown.Item title="Illustrations | Goods" value="goods/illustrations" />
            <List.Dropdown.Item title="Patterns | Goods" value="goods/patterns" />
            <List.Dropdown.Item title="Mockups | Goods" value="goods/mockups" />
            <List.Dropdown.Item title="Textures | Goods" value="goods/textures" />
            <List.Dropdown.Item title="Logos | Goods" value="goods/logos" />
            <List.Dropdown.Item title="Extensions | Goods" value="goods/extensions" />
            <List.Dropdown.Item title="Themes | Goods" value="goods/themes" />
            <List.Dropdown.Item title="Apps | Goods" value="goods/apps" />
            <List.Dropdown.Item title="Other | Goods" value="goods/other" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {items.map((item) => (
        <List.Item
          key={item.icon}
          icon={item.icon}
          title={item.title}
          detail={
            <List.Item.Detail
              markdown={`
## ${item.title}

![Illustration](${item.image})
          `}
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open in Browser" url={item.link} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
