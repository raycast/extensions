import { ActionPanel, Action, Icon, Detail } from "@raycast/api";
import RedditResultItem from "./RedditApi/RedditResultItem";

export default function PostActionPanel({
  data,
  showDetail,
  toggleDetail,
}: {
  data: RedditResultItem;
  showDetail: boolean;
  toggleDetail: () => void;
}) {
  if (data.description) {
    const browser = <Action.OpenInBrowser key="browser" url={data.url} icon={Icon.Globe} />;
    const fullScreenDetail = (
      <Action.Push
        key="showFullDetails"
        title="Show Full Details"
        icon={Icon.TextDocument}
        target={
          <Detail
            navigationTitle={data.title}
            markdown={`# ${data.title}
*Posted ${data.created}, r/${data.subreddit}*
        
${data.description}`}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={data.url} icon={Icon.Globe} />
              </ActionPanel>
            }
          />
        }
      />
    );

    const actions = [];
    if (showDetail) {
      actions.push(browser);
      actions.push(fullScreenDetail);
    } else {
      actions.push(fullScreenDetail);
      actions.push(browser);
    }

    return (
      <ActionPanel>
        {...actions}
        <Action
          title="Toggle Details"
          icon={Icon.Sidebar}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          onAction={() => toggleDetail()}
        />
      </ActionPanel>
    );
  } else if (data.imageUrl) {
    const browser = <Action.OpenInBrowser key="browser" url={data.url} icon={Icon.Globe} />;
    const fullScreenDetail = (
      <Action.Push
        key="showFullDetails"
        title="Show Full Details"
        icon={Icon.TextDocument}
        target={
          <Detail
            navigationTitle={data.title}
            markdown={`# ${data.title}
*Posted ${data.created}, r/${data.subreddit}*
        
![${data.title}](${data.imageUrl} "${data.title}}")`}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={data.url} icon={Icon.Globe} />
              </ActionPanel>
            }
          />
        }
      />
    );

    const actions = [];
    if (showDetail) {
      actions.push(browser);
      actions.push(fullScreenDetail);
    } else {
      actions.push(fullScreenDetail);
      actions.push(browser);
    }

    return (
      <ActionPanel>
        {...actions}
        <Action
          title="Toggle Details"
          icon={Icon.Sidebar}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          onAction={() => toggleDetail()}
        />
      </ActionPanel>
    );
  } else if (data.contentUrl) {
    const browser = <Action.OpenInBrowser key="browser" url={data.url} icon={Icon.Globe} />;
    const fullScreenDetail = (
      <Action.Push
        key="showFullDetails"
        title="Show Full Details"
        icon={Icon.TextDocument}
        target={
          <Detail
            navigationTitle={data.title}
            markdown={`# ${data.title}
*Posted ${data.created}, r/${data.subreddit}*
        
${data.contentUrl}`}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={data.contentUrl} icon={Icon.Globe} />
                <Action.OpenInBrowser title="Open reddit post" url={data.contentUrl} icon={Icon.Globe} />
              </ActionPanel>
            }
          />
        }
      />
    );

    const actions = [];
    if (showDetail) {
      actions.push(browser);
      actions.push(fullScreenDetail);
    } else {
      actions.push(fullScreenDetail);
      actions.push(browser);
    }

    return (
      <ActionPanel>
        {...actions}
        <Action
          title="Toggle Details"
          icon={Icon.Sidebar}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          onAction={() => toggleDetail()}
        />
      </ActionPanel>
    );
  } else {
    const browser = <Action.OpenInBrowser key="browser" url={data.url} icon={Icon.Globe} />;
    const fullScreenDetail = (
      <Action.Push
        key="showFullDetails"
        title="Show Full Details"
        icon={Icon.TextDocument}
        target={
          <Detail
            navigationTitle={data.title}
            markdown={`# ${data.title}
*Posted ${data.created}, r/${data.subreddit}*
        
${data.url}`}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={data.url} icon={Icon.Globe} />
              </ActionPanel>
            }
          />
        }
      />
    );

    const actions = [];
    if (showDetail) {
      actions.push(browser);
      actions.push(fullScreenDetail);
    } else {
      actions.push(fullScreenDetail);
      actions.push(browser);
    }

    return (
      <ActionPanel>
        {...actions}
        <Action
          title="Toggle Details"
          icon={Icon.Sidebar}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          onAction={() => toggleDetail()}
        />
      </ActionPanel>
    );
  }
}
