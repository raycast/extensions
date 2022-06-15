import { Action, ActionPanel, Detail, List, useNavigation } from "@raycast/api";
import { formatDistanceToNow } from "date-fns";
import numeral from "numeral";
import { Video } from "../lib/interfaces";
import { Actions } from "./Actions";

const URL_REGEX =
  /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=+$,\w]+@)?[A-Za-z0-9.-]+|(?:www\.|[-;:&=+$,\w]+@)[A-Za-z0-9.-]+)((?:\/[+~%/.\w\-_]*)?\??(?:[-+=&;%@.\w_]*)#?(?:[.!/\\\w]*))?)/g;

export function Details(video: Video) {
  const { pop } = useNavigation();
  const { title, description, videoId, liveViewers, startAt, topic } = video;

  const markdown = `
![Thumbnail](https://i.ytimg.com/vi/${videoId}/mqdefault.jpg)
# ${title}

${liveViewers ? `👀 ${numeral(liveViewers).format("0a")}` : ""}${
    startAt ? `  ⏱ ${formatDistanceToNow(startAt, { addSuffix: true })}` : ""
  }${topic ? `  ⚡️ ${topic.split("_").join(" ")}` : ""}

${
  description
    ? `---
${description}`
    : ""
}`;

  return (
    <Detail
      navigationTitle={`Video: ${videoId}`}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Actions isInDetail={true} video={video} />
          <ActionPanel.Section>
            <Action title="Go Back" onAction={pop} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function DetailView(props: Video) {
  const { title, description, videoId, liveViewers, startAt, topic } = props;

  const markdown = `
![Thumbnail](https://i.ytimg.com/vi/${videoId}/mqdefault.jpg)
## ${title}

${liveViewers ? `👀 ${numeral(liveViewers).format("0a")}` : ""}${
    startAt ? `  ⏱ ${formatDistanceToNow(startAt, { addSuffix: true })}` : ""
  }${topic ? `  ⚡️ ${topic.split("_").join(" ")}` : ""}

${
  description
    ? `---
${description.replace(URL_REGEX, "<$1>")}`
    : ""
}`;

  return <List.Item.Detail markdown={markdown} />;
}
