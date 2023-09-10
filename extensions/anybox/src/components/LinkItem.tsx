import {
  ActionPanel,
  Action,
  List,
  useNavigation,
  closeMainWindow,
  Icon,
  Detail,
  Image,
  open,
  getPreferenceValues,
} from "@raycast/api";
import { getAndCloseMainWindow } from "../utilities/fetch";
import fetch from "node-fetch";
import dayjs from "dayjs";
import calendar from "dayjs/plugin/calendar";
import "dayjs/locale/en";
import { Link } from "../utilities/searchRequest";
import { Preferences } from "../utilities/searchRequest";

const preferences: Preferences = getPreferenceValues();

dayjs.locale("en");
dayjs.extend(calendar);

function updateDateLastOpened(id: string) {
  fetch("http://127.0.0.1:6391/document/" + id, {
    method: "PUT",
    headers: {
      "x-api-key": preferences.api_key,
    },
  });
}

function relativeDate(dateString: string): string {
  const date = dayjs(dateString);
  const result = date.calendar(null, {
    sameDay: "[Today at] HH:mm",
    lastDay: "[Yesterday at] HH:mm",
    lastWeek: "[Last] dddd",
    sameElse: "MMM D, YYYY",
  });
  return result;
}

function formatSubtitle(link: Link): string {
  if (link.comment) {
    // em space U+2003
    return link.host + " " + link.comment;
  }
  return link.host;
}

function fullDate(dateString: string): string {
  const date = dayjs(dateString);
  const result = date.calendar(null, {
    sameDay: "[Today at] HH:mm",
    lastDay: "[Yesterday at] HH:mm",
    lastWeek: "MMM D, YYYY [at] HH:mm",
    sameElse: "MMM D, YYYY [at] HH:mm",
  });
  return result;
}

function formatDomain(host: string): string {
  const domain = host.split("/")[0];
  return domain;
}

interface Props {
  item: Link;
  isSearchEngine: boolean;
  searchText: string;
}

export default function LinkItem(props: Props) {
  const { pop } = useNavigation();

  const onFinished = () => {
    closeMainWindow({ clearRootSearch: true });
    pop();
  };
  const item = props.item;
  const isSearchEngine = props.isSearchEngine;
  const searchText = props.searchText;

  const iconLink = (identifier: string) => {
    return `http://127.0.0.1:6391/images/${identifier}/icon`;
  };

  const imageLink = (identifier: string) => {
    return `http://127.0.0.1:6391/images/${identifier}/image`;
  };

  const getDetail = (link: Link) => {
    let md = `## ${link.title}\n`;

    if (link.hasLinkImage) {
      md += `![](${imageLink(link.id)})\n\n`;
    }

    if (link.description) {
      md += `\n${link.description}\n\n`;
    }
    md += `[${link.url}](${link.url})\n`;
    return md;
  };

  const DefaultAction = (props: Props) => {
    const item = props.item;
    const isSearchEngine = props.isSearchEngine;
    return (
      <Action
        title={isSearchEngine ? "Continue to Search in Browser" : "Open in Browser"}
        icon={isSearchEngine ? Icon.MagnifyingGlass : Icon.Globe}
        onAction={() => {
          if (isSearchEngine) {
            const newURL = item.url.replace("_keyword_", encodeURIComponent(searchText));
            open(newURL, item.preferredBrowser);
          } else {
            open(item.url, item.preferredBrowser);
            updateDateLastOpened(item.id);
          }
          onFinished();
        }}
      />
    );
  };

  const ShowDetailAction = (props: Props) => {
    const item = props.item;
    return (
      <Action.Push
        title="Show Details"
        icon={Icon.Sidebar}
        target={
          <Detail
            markdown={getDetail(item)}
            navigationTitle={item.title}
            metadata={
              <Detail.Metadata>
                <Detail.Metadata.Label title="Last Opened" text={fullDate(item.dateLastOpened)} />
                <Detail.Metadata.Label title="Added" text={fullDate(item.dateAdded)} />
                <Detail.Metadata.Link title="Domain" target={item.url} text={formatDomain(item.host)} />
                <Detail.Metadata.Label
                  title="Starred"
                  icon={{ source: item.isStarred ? "star.fill.png" : "star.png" }}
                />
                {item.tags.length && (
                  <Detail.Metadata.TagList title="Tags">
                    {item.tags.map((tag, index) => (
                      <Detail.Metadata.TagList.Item key={index} text={tag.originalName} color={tag.color} />
                    ))}
                  </Detail.Metadata.TagList>
                )}
                {item.comment && <Detail.Metadata.Label title="Comment" text={item.comment} />}
              </Detail.Metadata>
            }
            actions={
              <ActionPanel>
                <DefaultAction {...props} />
                <Actions {...props} />
              </ActionPanel>
            }
          />
        }
      />
    );
  };

  const Actions = (props: Props) => {
    const item = props.item;
    return (
      <>
        <Action.CopyToClipboard
          content={item.url}
          title="Copy Link"
          onCopy={onFinished}
          icon={Icon.Link}
          shortcut={{ modifiers: ["cmd"], key: "p" }}
        />
        <Action.CopyToClipboard
          content={`[${item.title}](${item.url})`}
          title="Copy as Markdown"
          onCopy={onFinished}
          icon={Icon.StarCircle}
          shortcut={{ modifiers: ["cmd"], key: "m" }}
        />
        <Action.Paste
          content={item.url}
          title="Paste Link"
          icon={Icon.Paperclip}
          onPaste={onFinished}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        />
        <Action.Paste
          content={`[${item.title}(${item.url})]`}
          title="Paste as Markdown"
          icon={Icon.Star}
          onPaste={onFinished}
          shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
        />
        <Action
          title="Show in Anybox"
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          icon="anybox-icon-small.png"
          onAction={() => {
            getAndCloseMainWindow(`document/${item.id}`);
            pop();
          }}
        />
      </>
    );
  };

  return (
    <List.Item
      title={item.title}
      subtitle={formatSubtitle(item)}
      icon={{
        source: iconLink(item.id),
        fallback: Icon.Globe,
        mask: Image.Mask.RoundedRectangle,
      }}
      accessories={[{ text: isSearchEngine ? "" : relativeDate(item.dateLastOpened) }]}
      key={item.id}
      id={item.id}
      actions={
        <ActionPanel title={item.title}>
          <DefaultAction {...props} />
          {!isSearchEngine && <ShowDetailAction {...props} />}
          {!isSearchEngine && <Actions {...props} />}
        </ActionPanel>
      }
    />
  );
}
