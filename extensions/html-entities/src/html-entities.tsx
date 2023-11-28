import { List, Grid, ActionPanel, Action, Clipboard, environment } from "@raycast/api";
import { useState, useMemo, PropsWithChildren } from "react";

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
  const css = item.css.replace(/\\/g, "");

  return (
    <Grid.Item
      id={item.name}
      content={{
        source: {
          dark: `${environment.assetsPath}/images/dark/${css}.png`,
          light: `${environment.assetsPath}/images/light/${css}.png`,
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
