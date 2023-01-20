import { Action, ActionPanel, Color, Detail, useNavigation } from "@raycast/api";
import { AxiosRequestConfig } from "axios";
import { methodColors } from "../../utils";

type AxiosResponse<T = never> = {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: AxiosRequestConfig<T>;
  request?: unknown;
};

type Result = {
  method: string;
  response: AxiosResponse;
};

export default function ResultView({ result, curl }: { result: Result; curl: string }) {
  const markdown = "### Response\n\n" + "```json\n" + JSON.stringify(result.response.data, null, 2) + "\n\n";

  return (
    <Detail
      navigationTitle="Response"
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Method">
            <Detail.Metadata.TagList.Item
              text={`${result.method}`}
              color={(methodColors as { [index: string]: Color })[result.method]}
            />
          </Detail.Metadata.TagList>

          <Detail.Metadata.TagList title="Status code">
            <Detail.Metadata.TagList.Item text={`${result.response.status}`} color={"#00b969"} />
            <Detail.Metadata.TagList.Item text={`${result.response.statusText}`} color={"#00b969"} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          {/* HEADERS */}

          {Object.entries(result.response.headers).map(([key, value]) => (
            <Detail.Metadata.Label key={key} title={key} text={value} />
          ))}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy cURL" content={curl} />
          <Action.CopyToClipboard title="Copy Response" content={JSON.stringify(result.response.data, null, 2)} />
          <Action.CopyToClipboard
            title="Copy Headers"
            content={JSON.stringify(result.response.data, null, 2)}
            shortcut={{ modifiers: ["cmd"], key: "h" }}
          />
        </ActionPanel>
      }
    />
  );
}
