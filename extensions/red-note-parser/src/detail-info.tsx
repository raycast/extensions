import { Action, ActionPanel, Detail, Image } from "@raycast/api";
import { DetailData } from "./types.js";
import client from "./client.js";

export default function DetailInfo(props: { details: DetailData }) {
  const { details } = props;

  const markdown = `${details.desc}\n\n${details.images.map((image) => `<img src="${image}" height="320"/>`).join("\n\n")}`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={details.title}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Author"
            text={details.user.nickname}
            icon={{
              source: details.user.avatar,
              mask: Image.Mask.Circle,
            }}
          />
          <Detail.Metadata.Label title="Title" text={details.title} />
          <Detail.Metadata.Label title="Description" text={details.desc} />
          <Detail.Metadata.TagList title="Tags">
            {details.tags.map((tag, index) => (
              <Detail.Metadata.TagList.Item key={`tag-${index}`} text={tag} color={"#eed535"} />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Source" target={details.originalUrl} text={details.originalUrl} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Save to Downloads" onAction={() => client.saveToLocal(details)} />
          <Action.OpenInBrowser title="Open in Browser" url={details.originalUrl} />
        </ActionPanel>
      }
    ></Detail>
  );
}
