import {
  ActionPanel,
  CopyToClipboardAction,
  Detail,
  List,
  OpenInBrowserAction,
  useNavigation,
} from "@raycast/api";
import Parser from "rss-parser";
import { useEffect, useState } from "react";
import * as timeago from "timeago.js";
import nl from "timeago.js/lib/lang/nl";
const parser = new Parser();
timeago.register("nl_NL", nl);

interface State {
  items?: Parser.Item[];
  error?: Error;
}
export default function Command() {
  const [state, setState] = useState<State>({});

  useEffect(() => {
    async function fetchStories() {
      try {
        const feed = await parser.parseURL(
          "http://feeds.nos.nl/nosnieuwsalgemeen"
        );
        setState({ items: feed.items });
      } catch (error) {
        setState({
          error:
            error instanceof Error ? error : new Error("Something went wrong"),
        });
      }
    }

    fetchStories();
  }, []);

  return (
    <List isLoading={!state.items && !state.error}>
      {state.items?.map((item, index) => (
        <StoryListItem key={item.guid} item={item} index={index} />
      ))}
    </List>
  );
}

function StoryListItem(props: { item: Parser.Item; index: number }) {
  const pubDate = timeago.format(props.item.pubDate?.toString() ?? "", "nl_NL");

  return (
    <List.Item
      title={props.item.title ?? "No title"}
      accessoryTitle={`${pubDate}`}
      actions={<Actions item={props.item} />}
    />
  );
}

function Actions(props: { item: Parser.Item }) {
  const { push } = useNavigation();

  return (
    <ActionPanel title={props.item.title}>
      <ActionPanel.Section>
        <ActionPanel.Item
          title="View Item"
          onAction={() => push(<StoryDetail item={props.item} />)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        {props.item.link && <OpenInBrowserAction url={props.item.link} />}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {props.item.link && (
          <CopyToClipboardAction
            content={props.item.link}
            title="Copy Link"
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function StoryDetail(props: { item: Parser.Item }) {
  const pubDate = timeago.format(props.item.pubDate?.toString() ?? "", "nl_NL");

  function cleanHtml(html: string | undefined) {
    return (html ?? "").replace(/<\/?[^>]+(>|$)/g, "");
  }

  function getMarkDownContent() {
    let markDownContent = "";
    if (props.item.enclosure) {
      markDownContent += `![](${props.item.enclosure.url})\n\n`;
    }
    markDownContent += `# ${cleanHtml(props.item.title)}\n\n`;
    markDownContent += `### ${pubDate}\n\n`;
    markDownContent += `${props.item.contentSnippet} \n`;
    return markDownContent;
  }

  return (
    <Detail
      markdown={getMarkDownContent()}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {props.item.link && <OpenInBrowserAction url={props.item.link} />}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
