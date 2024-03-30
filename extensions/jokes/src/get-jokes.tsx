import fetch, { FetchError } from "node-fetch";
import { useEffect, useState } from "react";
import { Action, ActionPanel, Color, Detail, Icon, LaunchProps, List, Toast, showToast } from "@raycast/api";
import { ErrorResponse, JokeResponse, SingleJoke, TwoPartJoke } from "./types";
import { API_URL, ENABLE_SAFE_MODE, FLAGS } from "./constants";

export default function GetJoke(props: LaunchProps<{ arguments: Arguments.GetJokes }>) {
  const { category, type, amount } = props.arguments;

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<JokeResponse>();
  const [error, setError] = useState<ErrorResponse>();

  async function getJokes() {
    try {
      setIsLoading(true);
      await showToast({
        title: "PROCESSING",
        message: `Fetching Joke(s)`,
        style: Toast.Style.Animated,
      });

      // get unchecked flags
      const falseFlags = Object.entries(FLAGS)
        .filter(([, value]) => !value)
        .map(([key]) => key)
        .join()
        .replaceAll("allow_", "");

      const baseParams = new URLSearchParams({
        format: "json",
      });
      if (falseFlags.length) baseParams.append("blacklistFlags", falseFlags);
      if (amount) baseParams.append("amount", amount);
      if (type) baseParams.append("type", type);

      // we manually append safe-mode as it is without a value
      const urlParams = ENABLE_SAFE_MODE ? `${baseParams}&safe-mode` : baseParams;

      const response = await fetch(`${API_URL}joke/${category}?${urlParams}`);
      const jsonResponse = (await response.json()) as JokeResponse | ErrorResponse;
      if (jsonResponse.error) {
        setError(jsonResponse);
        await showToast({
          title: "ERROR",
          message: jsonResponse.message,
          style: Toast.Style.Failure,
        });
      } else {
        setData(jsonResponse);
        const message = "amount" in jsonResponse ? `Fetched ${jsonResponse.amount} jokes` : "Fetched 1 joke";
        await showToast({
          title: "SUCCESS",
          message,
          style: Toast.Style.Success,
        });
      }
    } catch (err: any) {
      setError({
        error: true,
        internalError: false,
        code: 0,
        message: err.message,
        causedBy: [],
        timestamp: Date.now(),
        additionalInfo: "-",
      });
      await showToast({
        title: "ERROR",
        message: err.message,
        style: Toast.Style.Failure,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    getJokes();
  }, []);

  const generateMarkdown = (joke: SingleJoke | TwoPartJoke) => {
    return joke.type === "single"
      ? joke.joke
      : `${joke.setup}
    
---

${joke.delivery}`;
  };

  return error ? (
    <ErrorComponent error={error} />
  ) : data && "amount" in data ? (
    <List isLoading={isLoading} isShowingDetail>
      {data.jokes.map((joke) => (
        <List.Item
          key={joke.id}
          title={joke.id.toString()}
          detail={
            <List.Item.Detail
              markdown={generateMarkdown(joke)}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.TagList title="Category">
                    <List.Item.Detail.Metadata.TagList.Item text={joke.category} />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Label title="Type" text={joke.type} />
                  {joke.type === "single" ? (
                    <List.Item.Detail.Metadata.Label title="Type" text={joke.joke} />
                  ) : (
                    <>
                      <List.Item.Detail.Metadata.Label title="Setup" text={joke.setup} />
                      <List.Item.Detail.Metadata.Label title="Delivery" text={joke.delivery} />
                    </>
                  )}
                  <List.Item.Detail.Metadata.Label title="ID" text={joke.id.toString()} />
                  <List.Item.Detail.Metadata.Label title="Safe" icon={joke.safe ? Icon.Check : Icon.Multiply} />
                  <List.Item.Detail.Metadata.TagList title="Language">
                    <List.Item.Detail.Metadata.TagList.Item text={joke.lang} />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.TagList title="Flags">
                    <List.Item.Detail.Metadata.TagList.Item text={`NSFW: ${joke.flags.nsfw ? "✅" : "❌"}`} />
                    <List.Item.Detail.Metadata.TagList.Item text={`Religious: ${joke.flags.religious ? "✅" : "❌"}`} />
                    <List.Item.Detail.Metadata.TagList.Item text={`Political: ${joke.flags.political ? "✅" : "❌"}`} />
                    <List.Item.Detail.Metadata.TagList.Item text={`Racist: ${joke.flags.racist ? "✅" : "❌"}`} />
                    <List.Item.Detail.Metadata.TagList.Item text={`Sexist: ${joke.flags.sexist ? "✅" : "❌"}`} />
                    <List.Item.Detail.Metadata.TagList.Item text={`Explicit: ${joke.flags.explicit ? "✅" : "❌"}`} />
                  </List.Item.Detail.Metadata.TagList>
                </List.Item.Detail.Metadata>
              }
            />
          }
          accessories={[{ tag: joke.category }, { tag: { value: "safe", color: joke.safe ? Color.Green : Color.Red } }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Joke to Clipboard"
                content={joke.type === "single" ? joke.joke : joke.setup.concat("\n", joke.delivery)}
                icon={Icon.Clipboard}
              />
              <Action title="Get New Joke" icon={Icon.Redo} onAction={getJokes} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  ) : (
    <Detail
      isLoading={isLoading}
      markdown={data ? generateMarkdown(data) : ""}
      metadata={
        data && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Error" icon={Icon.Multiply} />
            <Detail.Metadata.TagList title="Category">
              <Detail.Metadata.TagList.Item text={data.category} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="Type" text={data.type} />
            {data.type === "single" ? (
              <Detail.Metadata.Label title="Type" text={data.joke} />
            ) : (
              <>
                <Detail.Metadata.Label title="Setup" text={data.setup} />
                <Detail.Metadata.Label title="Delivery" text={data.delivery} />
              </>
            )}
            <Detail.Metadata.Label title="ID" text={data.id.toString()} />
            <Detail.Metadata.Label title="Safe" icon={data.safe ? Icon.Check : Icon.Multiply} />
            <Detail.Metadata.TagList title="Language">
              <Detail.Metadata.TagList.Item text={data.lang} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.TagList title="Flags">
              <Detail.Metadata.TagList.Item text={`NSFW: ${data.flags.nsfw ? "✅" : "❌"}`} />
              <Detail.Metadata.TagList.Item text={`Religious: ${data.flags.religious ? "✅" : "❌"}`} />
              <Detail.Metadata.TagList.Item text={`Political: ${data.flags.political ? "✅" : "❌"}`} />
              <Detail.Metadata.TagList.Item text={`Racist: ${data.flags.racist ? "✅" : "❌"}`} />
              <Detail.Metadata.TagList.Item text={`Sexist: ${data.flags.sexist ? "✅" : "❌"}`} />
              <Detail.Metadata.TagList.Item text={`Explicit: ${data.flags.explicit ? "✅" : "❌"}`} />
            </Detail.Metadata.TagList>
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          {data && (
            <Action.CopyToClipboard
              title="Copy Joke to Clipboard"
              content={data.type === "single" ? data.joke : data.setup.concat("\n", data.delivery)}
              icon={Icon.Clipboard}
            />
          )}
          <Action title="Get New Joke" icon={Icon.Redo} onAction={getJokes} />
        </ActionPanel>
      }
    />
  );
}

function ErrorComponent({ error }: { error: ErrorResponse }) {
  const markdown = `# ERROR
    
${error.message}
---
${error.additionalInfo}

${error.causedBy.map((cause) => "- " + cause + "\n")}`;

  return (
    <Detail
      navigationTitle="Error"
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Error" icon={error ? Icon.Check : Icon.Multiply} />
          <Detail.Metadata.Label title="Internal Error" icon={error ? Icon.Check : Icon.Multiply} />
          <Detail.Metadata.TagList title="Code">
            <Detail.Metadata.TagList.Item text={error.code.toString()} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Message" text={error.message} />
          <Detail.Metadata.Label title="Additional Info" text={error.additionalInfo} />
          <Detail.Metadata.Label title="Timestamp" text={error.timestamp.toString()} />
          {error.causedBy.map((cause, causeIndex) => (
            <Detail.Metadata.Label key={causeIndex} title={!causeIndex ? "Caused By" : ""} text={cause} />
          ))}
        </Detail.Metadata>
      }
    />
  );
}
