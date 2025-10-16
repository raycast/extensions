import { useState, FC, useMemo } from "react";
import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { CONTENTFUL } from "./lib/contentful";
import { ContentType, EntryProps, KeyValueMap, QueryOptions } from "contentful-management";
import { CONTENTFUL_APP_URL, CONTENTFUL_LOCALE, CONTENTFUL_SPACE } from "./lib/config";
import OpenInContentful from "./lib/components/open-in-contentful";

type ContentfulContentEntry = EntryProps<KeyValueMap>;
type ContentfulEntryStatus = "archived" | "published" | "draft" | "changed";

function getEntryStatus(entry: ContentfulContentEntry): ContentfulEntryStatus {
  // reference: https://www.contentful.com/developers/docs/tutorials/general/determine-entry-asset-state/
  if (!entry.sys.publishedVersion) return "draft";
  if (entry.sys.archivedVersion) return "archived";
  if (!!entry.sys.publishedVersion && entry.sys.version >= entry.sys.publishedVersion + 2) return "changed";
  return "published";
}

export const ColorMapping: Record<ContentfulEntryStatus, Color> = {
  archived: Color.Magenta,
  published: Color.Green,
  draft: Color.Orange,
  changed: Color.Blue,
};

export default function ContentfulSearch() {
  const space = CONTENTFUL_SPACE;

  const [contentType, setContentType] = useState<string>("__all__");

  const [searchText, setSearchText] = useState("");
  const [showDetail, setShowDetail] = useState(false);
  const toggleDetail = () => setShowDetail((s) => !s);

  const { isLoading: contentTypesLoading, data: contentTypes } = useCachedPromise(
    async () => {
      const response = await CONTENTFUL.contentType.getMany({});
      return response;
    },
    [],
    {
      keepPreviousData: true,
    },
  );

  const contentTypesDict: Record<string, ContentType> = useMemo(
    () =>
      contentTypes?.items.reduce(
        (dict, item) => ({
          ...dict,
          [item.sys.id]: item,
        }),
        {},
      ) || {},
    [contentTypes],
  );

  const { isLoading, data: entries } = useCachedPromise(
    async (content_type: string, query_text: string) => {
      const query: QueryOptions = {
        content_type,
        query: query_text,
      };
      if (!content_type || content_type === "__all__") delete query.content_type;
      const response = await CONTENTFUL.entry.getMany({ query });
      return response;
    },
    [contentType, searchText],
    {
      keepPreviousData: true,
    },
  );

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
      isShowingDetail={showDetail}
      searchBarPlaceholder="Search content"
      searchBarAccessory={
        <List.Dropdown tooltip="Content Type" isLoading={contentTypesLoading} onChange={setContentType}>
          <List.Dropdown.Item icon={Icon.Layers} title="All" value="__all__" />
          {contentTypes?.items.map((contentType) => (
            <List.Dropdown.Item
              icon={Icon.Layers}
              key={contentType.sys.id}
              title={contentTypesDict[contentType.sys.id].name}
              value={contentType.sys.id}
              keywords={[contentType.sys.id]}
            />
          ))}
        </List.Dropdown>
      }
    >
      {entries?.items.map((entry) => {
        const titleField = entry.fields[contentTypesDict[entry.sys.contentType.sys.id].displayField];
        const title = titleField[CONTENTFUL_LOCALE] ?? "title";
        return (
          <ContentfulContentEntryItem
            key={entry.sys.id}
            entry={entry}
            title={title}
            type={contentTypesDict[entry.sys.contentType.sys.id]?.name}
            space={space}
            showDetail={showDetail}
            toggleDetail={toggleDetail}
          />
        );
      })}
    </List>
  );
}

export interface ContentfulContentEntryItemProps {
  space: string;
  entry: ContentfulContentEntry;
  title: string;
  type: string;
  toggleDetail: () => void;
  showDetail?: boolean;
}

export const ContentfulContentEntryItem: FC<ContentfulContentEntryItemProps> = ({
  entry,
  title,
  type,
  space,
  showDetail,
  toggleDetail,
}) => {
  const entryUrl = `${CONTENTFUL_APP_URL}spaces/${space}/entries/${entry.sys.id}`;
  const status = getEntryStatus(entry);
  const statusColor = ColorMapping[status];

  return (
    <List.Item
      icon={Icon.Document}
      key={entry.sys.id}
      title={title}
      actions={
        <ActionPanel>
          <OpenInContentful url={entryUrl} />
          <Action
            title={showDetail ? "Hide Detail" : "Show Detail"}
            icon={Icon.AppWindowSidebarLeft}
            onAction={toggleDetail}
          />
        </ActionPanel>
      }
      accessories={
        !showDetail
          ? [
              {
                text: type,
              },
              {
                tag: {
                  value: status,
                  color: statusColor,
                },
              },
            ]
          : []
      }
      detail={showDetail && <ContentfulContentEntryDetail entry={entry} status={status} type={type} />}
    />
  );
};

export interface ContentfulContentEntryDetailProps {
  entry: ContentfulContentEntry;
  status: ContentfulEntryStatus;
  type: string;
}

export const ContentfulContentEntryDetail: FC<ContentfulContentEntryDetailProps> = ({ entry, status, type }) => {
  const statusColor = ColorMapping[status];

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="id"
            text={{
              value: entry.sys.id,
              color: Color.SecondaryText,
            }}
          />
          <List.Item.Detail.Metadata.TagList title="Type">
            <List.Item.Detail.Metadata.TagList.Item text={type} />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item text={status} color={statusColor} />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Fields" />
          {Object.keys(entry.fields).map((key) => {
            const field = entry.fields[key][CONTENTFUL_LOCALE];
            return (
              <List.Item.Detail.Metadata.Label
                key={key}
                title={key}
                text={typeof field === "string" ? field : JSON.stringify(field)}
              />
            );
          })}

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Sys" />

          {Object.keys(entry.sys).map((key) => {
            const field = entry.sys[key as keyof ContentfulContentEntry["sys"]];
            return (
              <List.Item.Detail.Metadata.Label
                key={key}
                title={key}
                text={typeof field === "string" ? field : JSON.stringify(field)}
              />
            );
          })}
        </List.Item.Detail.Metadata>
      }
    />
  );
};
