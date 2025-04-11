import {
  Action,
  ActionPanel,
  Icon,
  LaunchProps,
  LaunchType,
  List,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { Source, useSearch } from "./api";
import GenCommand from "./pt-gen";

interface SearchArguments {
  query: string;
}

export default function SearchCommand(
  props: LaunchProps<{ arguments: SearchArguments }>,
) {
  const [searchText, setSearchText] = useState(
    props.arguments?.query ?? props.fallbackText ?? "",
  );
  const [debouncedSearchText, setDebouncedSearchText] = useState(searchText);
  const [source, setSource] = useState<Source>(Source.Douban);
  const { data, isLoading, error } = useSearch(debouncedSearchText, source);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 500);
    return () => clearTimeout(timeout);
  }, [searchText]);

  if ((error || data?.error) && !isLoading) {
    if (data?.error?.includes("Miss key of `site` or `sid`")) return;
    showFailureToast(error?.message ?? data?.error ?? "Unknown error", {
      title: "Failed to fetch search results",
    });
  }

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      navigationTitle="Search PT Gen"
      searchBarPlaceholder="Search ..."
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown
          tooltip="Source"
          value={source}
          onChange={(newValue) => {
            setSource(newValue as Source);
          }}
        >
          <List.Dropdown.Item title={Source.Douban} value={Source.Douban} />
          <List.Dropdown.Item title={Source.Bangumi} value={Source.Bangumi} />
        </List.Dropdown>
      }
    >
      {data?.data?.length === 0 ? (
        <List.EmptyView
          title="No results found"
          description="Please try again with a different query"
          icon={Icon.Bird}
        />
      ) : (
        data?.data?.map((item) => (
          <List.Item
            key={item.link}
            icon={Icon.Bird}
            title={item.title}
            subtitle={item.subtitle}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Details"
                  target={
                    <GenCommand
                      arguments={{ url: item.link }}
                      launchType={LaunchType.UserInitiated}
                    />
                  }
                />
                <Action.OpenInBrowser url={item.link} />
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="title"
                      text={item.title}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="subtitle"
                      text={item.subtitle}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="year"
                      text={item.year}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="subtype"
                      text={item.subtype}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="link"
                      text={item.link}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))
      )}
    </List>
  );
}
