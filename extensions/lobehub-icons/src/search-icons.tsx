import { Grid } from "@raycast/api";
import { useCallback, useMemo, useState } from "react";
import { createIconActions } from "./icon-actions";
import { preparedIcons } from "./icon-utils";

const pageSize = 60;

export default function SearchIconsCommand() {
  const [searchText, setSearchText] = useState("");
  const [visibleCount, setVisibleCount] = useState(pageSize);

  const filteredIcons = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    if (!query) {
      return preparedIcons;
    }

    const queryTerms = query.split(/\s+/).filter(Boolean);

    return preparedIcons
      .filter((icon) => queryTerms.every((term) => icon.searchText.includes(term)))
      .sort((left, right) => {
        const leftExact = Number(left.id.toLowerCase() === query || left.title.toLowerCase() === query);
        const rightExact = Number(right.id.toLowerCase() === query || right.title.toLowerCase() === query);

        if (leftExact !== rightExact) {
          return rightExact - leftExact;
        }

        const leftPrefix = Number(left.searchText.startsWith(query));
        const rightPrefix = Number(right.searchText.startsWith(query));

        if (leftPrefix !== rightPrefix) {
          return rightPrefix - leftPrefix;
        }

        return left.title.localeCompare(right.title);
      });
  }, [searchText]);

  const visibleIcons = useMemo(() => filteredIcons.slice(0, visibleCount), [filteredIcons, visibleCount]);

  const onSearchTextChange = useCallback((value: string) => {
    setSearchText(value);
    setVisibleCount(pageSize);
  }, []);

  const onLoadMore = useCallback(() => {
    setVisibleCount((current) => Math.min(current + pageSize, filteredIcons.length));
  }, [filteredIcons.length]);

  return (
    <Grid
      throttle
      columns={6}
      aspectRatio="1"
      fit={Grid.Fit.Contain}
      inset={Grid.Inset.Medium}
      filtering={false}
      onSearchTextChange={onSearchTextChange}
      pagination={{ hasMore: visibleCount < filteredIcons.length, onLoadMore, pageSize }}
      searchBarPlaceholder="Search LobeHub icons by name, provider, group, or variant"
      navigationTitle="Search LobeHub Icons"
    >
      {visibleIcons.length === 0 ? (
        <Grid.EmptyView title="No matching icons" description="Try searching by provider, brand, group, or variant." />
      ) : null}
      {visibleIcons.map((icon) => (
        <Grid.Item key={icon.id} content={icon.previewUrl} title={icon.title} actions={createIconActions(icon)} />
      ))}
    </Grid>
  );
}
