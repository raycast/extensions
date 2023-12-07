import { ActionPanel, Grid, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import React, { useEffect, useState } from "react";
import { useDebounce } from "./utils";
import { IconHit } from "./types";
import { COLUMNS, fetchPage, getItemPageProgress } from "./api";
import { IconActions } from "./components/actions/icon-actions";
import { GlobalActions } from "./components/actions/global-actions";

export default function BrowseCommand() {
  const { debouncedValue: searchQuery, setValue } = useDebounce("", 400);
  const [page, setPage] = useState(0);

  const [fullData, setFullData] = useState<IconHit[]>([]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery]);

  const { isLoading, data: lastPageResponse } = usePromise(
    async (searchQuery: string, page) =>
      page >= 0 ? fetchPage(searchQuery, page) : null,
    [searchQuery, page],
    {
      onData: (data) => {
        if (data == null) return;
        if (page === 0) return setFullData(data.hits);

        setFullData((prevFullData) => prevFullData.concat(data.hits));

        if (data.page >= data.nbPages) return setPage(-1);
      },
    },
  );

  const onSelectionChange = (id: string | null) => {
    if (
      isLoading ||
      (lastPageResponse &&
        lastPageResponse.page >= lastPageResponse.nbPages - 1)
    ) {
      return;
    }
    const index = fullData.findIndex((hit) => hit.objectID === id);
    const progress = getItemPageProgress(index);
    const roundToPage = Math.round(progress);

    if (page < roundToPage) {
      setPage(roundToPage);
    }
  };

  return (
    <Grid
      columns={COLUMNS}
      inset={Grid.Inset.Small}
      isLoading={isLoading}
      onSelectionChange={onSelectionChange}
      onSearchTextChange={setValue}
      filtering={false}
    >
      <Grid.EmptyView
        title="No icons found"
        description="Consider changing your search criteria in order to get better results"
      />
      {fullData.map((icon) => (
        <Grid.Item
          id={icon.objectID}
          content={{ source: icon.lowResPngUrl, fallback: Icon.DeleteDocument }}
          key={icon.objectID}
          title={icon.appName}
          subtitle={`􀁸 ${icon.downloads}  􀉪 ${icon.usersName}`}
          actions={
            <ActionPanel>
              <IconActions icon={icon} />
              <GlobalActions />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
