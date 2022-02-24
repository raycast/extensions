import { ActionPanel, Action, Icon, Detail } from "@raycast/api";
import RedditResultItem from "./RedditApi/RedditResultItem";

export default function PostActionPanel({ data }: { data: RedditResultItem }) {
  if (data.description) {
    return (
      <ActionPanel>
        <Action.Push
          title="Show Details"
          target={
            <Detail
              navigationTitle={data.title}
              markdown={`# ${data.title}
              
${data.description}`}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={data.url} icon={Icon.Globe} />
                </ActionPanel>
              }
            />
          }
        />
        <Action.OpenInBrowser url={data.url} icon={Icon.Globe} />
      </ActionPanel>
    );
  } else if (data.imageUrl) {
    return (
      <ActionPanel>
        <Action.Push
          title="Show Details"
          target={
            <Detail
              navigationTitle={data.title}
              markdown={`# ${data.title}
              
![${data.title}](${data.imageUrl} "${data.title}}")`}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={data.url} icon={Icon.Globe} />
                </ActionPanel>
              }
            />
          }
        />
        <Action.OpenInBrowser url={data.url} icon={Icon.Globe} />
      </ActionPanel>
    );
  } else if (data.contentUrl) {
    return (
      <ActionPanel>
        <Action.Push
          title="Show Details"
          target={
            <Detail
              navigationTitle={data.title}
              markdown={`# ${data.title}
              
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
        <Action.OpenInBrowser url={data.url} icon={Icon.Globe} />
      </ActionPanel>
    );
  } else {
    return (
      <ActionPanel>
        <Action.Push
          title="Show Details"
          target={
            <Detail
              navigationTitle={data.title}
              markdown={`# ${data.title}
              
${data.url}`}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={data.url} icon={Icon.Globe} />
                </ActionPanel>
              }
            />
          }
        />
        <Action.OpenInBrowser url={data.url} icon={Icon.Globe} />
      </ActionPanel>
    );
  }
}
