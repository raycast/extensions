import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Grid,
  Icon,
  Image,
  List,
  LocalStorage,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { ModelFormParams, ResultType } from "./types";
import { Fragment, useEffect, useState } from "react";
import { MODELS, fetchImageFromURL, sendPrompt } from "./utils";

export default function DisplayResult({ request }: { request: ModelFormParams }) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<ResultType>();
  useEffect(() => {
    setIsLoading(true);
    sendPrompt(request)
      .then((res) => {
        showToast(Toast.Style.Success, "Generation completed");
        setResult(res as ResultType);
        if (res?.error) {
          throw new Error(`${res?.error?.message}`);
        }
        setIsLoading(false);
      })
      .catch((error) => {
        showToast(Toast.Style.Failure, `${error}`);
        console.log(error);
        setIsLoading(false);
        pop();
      });
  }, []);
  return (
    <Fragment>
      {request?.model === "gpt" ? (
        <GPTResult result={result as ResultType} request={request} isLoading={isLoading} />
      ) : (
        <DALLEResult result={result as ResultType} request={request} isLoading={isLoading} />
      )}
    </Fragment>
  );
}

const DALLEResult = ({
  result,
  request,
  isLoading,
}: {
  result: ResultType;
  request: ModelFormParams;
  isLoading: boolean;
}) => {
  return (
    <Grid
      isLoading={isLoading}
      // columns={result?.data?.length && result?.data?.length > 5 ? 4 : 2}
      columns={2}
      filtering={false}
      navigationTitle={`Generated images for ${request?.prompt}`}
    >
      {isLoading ? (
        <Grid.EmptyView title="loading..." />
      ) : (
        result?.data?.map((item, index) => (
          <Grid.Item
            key={item?.url}
            actions={
              <ActionPanel>
                <Action title="Download" icon={Icon.Download} onAction={() => fetchImageFromURL(item?.url)} />
                <Action.OpenInBrowser url={item?.url} shortcut={{ modifiers: ["cmd"], key: "o" }} />
                <Action.CopyToClipboard
                  title="Copy link to clipboard"
                  content={item?.url}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                />
              </ActionPanel>
            }
            content={item?.url}
          />
        ))
      )}
    </Grid>
  );
};

const GPTResult = ({
  result,
  request,
  isLoading,
}: {
  result: ResultType;
  request: ModelFormParams;
  isLoading: boolean;
}) => {
  const content = result?.choices?.[0]?.message?.content;
  const markdown = `
    ${content ?? "loading..."}
    `;
  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      navigationTitle="Generated response"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Prompt" text={request?.prompt} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Model" text={MODELS[request?.model as string]?.name} />
          <Detail.Metadata.TagList title="Params">
            <Detail.Metadata.TagList.Item
              text={`role: ${
                ["user", "assistant", "none"].includes(request?.role as string) ? request?.role : "system"
              }`}
              color={Color.PrimaryText}
            />
            <Detail.Metadata.TagList.Item text={`temperature: ${request?.temperature}`} color={Color.PrimaryText} />
            <Detail.Metadata.TagList.Item text={`n: ${request?.n}`} color={Color.PrimaryText} />
            <Detail.Metadata.TagList.Item
              text={`presence penalty: ${request?.presencePenalty}`}
              color={Color.PrimaryText}
            />
            <Detail.Metadata.TagList.Item
              text={`frequency penalty: ${request?.frequencyPenalty}`}
              color={Color.PrimaryText}
            />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy to clipboard"
            content={content as string}
            shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
};
