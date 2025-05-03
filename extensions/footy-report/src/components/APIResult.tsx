import {
  Action,
  ActionPanel,
  Detail,
  openExtensionPreferences,
  popToRoot,
} from "@raycast/api";
import { AxiosResponse } from "axios";

export const getJSONSnippet = (content: string) => "```" + content;

const APIResult = ({
  response,
  url,
}: {
  response: AxiosResponse;
  url: string;
}) => {
  const content = JSON.stringify(response?.data?.data, null, 2);
  return (
    <Detail
      navigationTitle="Response"
      markdown={`# Response 
${getJSONSnippet(content)}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            content={content}
            onCopy={() => popToRoot()}
          />
          <Action
            title="Open Extension Preferences"
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="URL" text={url} />
          <Detail.Metadata.TagList title="HTTP Method">
            <Detail.Metadata.TagList.Item text="GET" color="#C5947C" />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Content Type">
            <Detail.Metadata.TagList.Item
              text={response?.headers["content-type"]}
              color="#B55ABE"
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={response?.status?.toString()}
              color={response?.status === 200 ? "#71C6B1" : "#D5562E"}
            />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
    ></Detail>
  );
};

export default APIResult;
