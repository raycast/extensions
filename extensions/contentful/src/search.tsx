import { useState, FC, useMemo } from "react";
import {
  List,
  ActionPanel,
  Action,
  Detail,
  openExtensionPreferences,
  getPreferenceValues,
  Icon,
  Color,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";

const api = "https://api.contentful.com";

interface ContentfulResponse<T = never> {
  items: Array<T>;
}

interface ContentfulContentType {
  sys: {
    id: string;
  };
  displayField: string;
  name: string;
}

interface ContentfulContentEntry {
  sys: {
    id: string;
    type: string;
    contentType: {
      sys: {
        id: string;
      };
    };
    publishedCounter: number;
    updatedAt: string;
    publishedAt: string;
    createdBy: {
      sys: {
        id: string;
      };
    };
    publishedBy: {
      sys: {
        id: string;
      };
    };
    archivedVersion: number;
  };
  fields: Record<string, { "en-US": any }>;
}

export type ContentfulEntryStatus = "archived" | "published" | "draft" | "changed";

function getEntryStatus(entry: ContentfulContentEntry): ContentfulEntryStatus {
  const isChanged =
    entry.sys.updatedAt && entry.sys.publishedAt && Date.parse(entry.sys.updatedAt) > Date.parse(entry.sys.publishedAt);

  return entry.sys.archivedVersion
    ? "archived"
    : isChanged
    ? "changed"
    : entry.sys.publishedCounter > 0
    ? "published"
    : "draft";
}

export const ColorMapping: Record<ContentfulEntryStatus, Color> = {
  archived: Color.Magenta,
  published: Color.Green,
  draft: Color.Orange,
  changed: Color.Blue,
};

export default function ContentfulSearch() {
  const preferences = getPreferenceValues();
  const { token, space } = preferences;
  const environment = preferences.environment || "master";

  const [contentType, setContentType] = useState<string>("__all__");

  const [searchText, setSearchText] = useState("");
  const [showDetail, setShowDetail] = useState(false);
  const toggleDetail = () => setShowDetail((s) => !s);

  const { isLoading: contentTypesLoading, data: contentTypes } = useFetch<ContentfulResponse<ContentfulContentType>>(
    `${api}/spaces/${space}/environments/${environment}/content_types`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const contentTypesDict: Record<string, ContentfulContentType> = useMemo(
    () =>
      contentTypes?.items.reduce(
        (dict, item) => ({
          ...dict,
          [item.sys.id]: item,
        }),
        {}
      ) || {},
    [contentTypes]
  );

  const { isLoading, data: entries } = useFetch<ContentfulResponse<ContentfulContentEntry>>(
    `${api}/spaces/${space}/environments/${environment}/entries?${
      contentType && contentType !== "__all__" ? `content_type=${contentType}` : ""
    }&query=${searchText}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!token || !space) {
    return (
      <Detail
        markdown="Missing Contentful credentials. Please update it in extension preferences and try again."
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
      isShowingDetail={showDetail}
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
        const title = titleField ? titleField["en-US"] : "title";
        return (
          <ContentfulContentEntryItem
            key={entry.sys.id}
            entry={entry}
            title={title}
            type={contentTypesDict[entry.sys.contentType.sys.id].name}
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
  const entryUrl = `https://app.contentful.com/spaces/${space}/entries/${entry.sys.id}`;
  const status = getEntryStatus(entry);
  const statusColor = ColorMapping[status];

  return (
    <List.Item
      icon={Icon.Document}
      key={entry.sys.id}
      title={title}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={entryUrl} />
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
            const field = entry.fields[key]["en-US"];
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
