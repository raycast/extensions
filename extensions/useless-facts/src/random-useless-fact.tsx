import { useFetch } from "@raycast/utils";
import { API_URL } from "./constants";
import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { UselessFact } from "./types";
import ErrorComponent from "./ErrorComponent";

export default function RandomUselessFact() {
  const { isLoading, data, revalidate, error } = useFetch<UselessFact>(API_URL + "random");

  return error ? (
    <ErrorComponent error={error} />
  ) : (
    <Detail
      isLoading={isLoading}
      markdown={data?.text}
      metadata={
        data && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="ID" text={data.id} />
            <Detail.Metadata.Label title="Text" text={data.text} />
            <Detail.Metadata.Link title="Source" text={data.source} target={data.source_url} />
            <Detail.Metadata.TagList title="Language">
              <Detail.Metadata.TagList.Item text={data.language} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Link title="Permalink" text={data.permalink} target={data.permalink} />
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          <Action title="Get Another Useless Fact" onAction={revalidate} icon={Icon.Redo} />
          {data && (
            <>
              <Action.CopyToClipboard
                title="Copy Useless Fact to Clipboard"
                content={data.text}
                icon={Icon.Clipboard}
              />
              <Action.CopyToClipboard
                title="Copy All as JSON to Clipboard"
                content={JSON.stringify(data)}
                icon={Icon.CopyClipboard}
              />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
