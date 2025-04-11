import {
  Action,
  ActionPanel,
  Icon,
  LaunchProps,
  LaunchType,
  List,
} from "@raycast/api";
import { useState } from "react";
import { getSearch, Source } from "./api";
import GenCommand from "./pt-gen";

interface SearchArguments {
  query: string;
}

export default function SearchCommand(
  props: LaunchProps<{ arguments: SearchArguments }>,
) {
  const [searchText, setSearchText] = useState(
    props.arguments.query ?? props.fallbackText ?? "",
  );
  const [source, setSource] = useState<Source>(Source.Douban);

  const { data, isLoading } = getSearch(searchText, source);

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
      {data?.data?.map((item) => (
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
      ))}
    </List>
  );
}
