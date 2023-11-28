import { List, Grid, ActionPanel, Action, Clipboard } from "@raycast/api";
import { useState, useMemo, PropsWithChildren } from "react";
import { encode } from "js-base64";

import { prefersListView } from "./util/preferences";
import { getElements, HTMLElement } from "./data";
import { unicodeToChar } from "./util/stringUtils";

const BaseView = ({
  search,
  setSearch,
  children,
}: PropsWithChildren<{ search: string; setSearch: (s: string) => void }>) => {
  if (prefersListView) {
    return (
      <List searchBarPlaceholder="Search HTML Entities" throttle searchText={search} onSearchTextChange={setSearch}>
        {children}
      </List>
    );
  }
  return (
    <Grid
      searchBarPlaceholder="Search HTML Entities"
      throttle
      searchText={search}
      onSearchTextChange={setSearch}
      fit={Grid.Fit.Fill}
    >
      {children}
    </Grid>
  );
};

const getSquare = (item: HTMLElement, dark = false) => {
  const textColor = dark ? "#fff" : "#000";
  const backgroundColor = dark ? "#000" : "#fff";
  const size = 200;
  return `
  <svg height="${size}" width="${size}">
    <rect fill="${backgroundColor}" x="0" y="0" width="${size}" height="${size}"></rect>
    <text x="${size / 2}" y="${
      size / 1.4
    }" fill="${textColor}" text-anchor="middle" alignment-baseline="central" font-size="${
      size / 2
    }" line-height="0" font-family="mono-space">${unicodeToChar(item.uni)}</text>
  </svg>
  `;
};

const Actions = ({
  item,
  onCopy,
}: {
  item: HTMLElement;
  onCopy: (content: string | number | Clipboard.Content) => void;
}) => (
  <ActionPanel title={`Actions for "${item.name}"`}>
    <Action.CopyToClipboard
      shortcut={{ modifiers: [], key: "return" }}
      title={`Copy Unicode Character: ${unicodeToChar(item.uni)}`}
      content={item.uni}
      onCopy={onCopy}
    />
    <Action.CopyToClipboard
      shortcut={{ modifiers: ["cmd"], key: "h" }}
      title={`Copy HTML Code: ${item.htmlcode}`}
      content={item.htmlcode}
      onCopy={onCopy}
    />
    {item.htmlentity ? (
      <Action.CopyToClipboard
        shortcut={{ modifiers: ["cmd"], key: "e" }}
        title={`Copy HTML Entity: ${item.htmlentity}`}
        content={item.htmlentity}
        onCopy={onCopy}
      />
    ) : null}
    <Action.CopyToClipboard
      shortcut={{ modifiers: ["cmd"], key: "s" }}
      title={`Copy CSS Code: ${item.css}`}
      content={item.css}
      onCopy={onCopy}
    />
  </ActionPanel>
);

const GridItem = ({
  item,
  onCopy,
}: {
  item: HTMLElement;
  onCopy: (content: string | number | Clipboard.Content) => void;
}) => {
  const [light, dark] = useMemo(() => {
    return [
      `data:image/svg+xml;base64,${encode(getSquare(item))}`,
      `data:image/svg+xml;base64,${encode(getSquare(item, true))}`,
    ];
  }, [item]);

  return (
    <Grid.Item
      id={item.name}
      content={{
        source: {
          dark,
          light,
        },
      }}
      title={item.name}
      actions={<Actions item={item} onCopy={onCopy} />}
    />
  );
};

const SearchHTMLEntities = (props: { arguments: { query: string } }) => {
  const [search, setSearch] = useState<string>(props?.arguments?.query || "");

  const items = useMemo(() => {
    return getElements(search);
  }, [search]);

  return (
    <BaseView search={search} setSearch={setSearch}>
      {items.map((item) =>
        prefersListView ? (
          <List.Item
            key={item.name}
            id={item.name}
            title={item.name}
            subtitle={item.uni}
            actions={
              <Actions
                item={item}
                onCopy={() => {
                  setSearch("");
                }}
              />
            }
          />
        ) : (
          <GridItem
            key={item.name}
            item={item}
            onCopy={() => {
              setSearch("");
            }}
          />
        ),
      )}
    </BaseView>
  );
};

export default SearchHTMLEntities;
