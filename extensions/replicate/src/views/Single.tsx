import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { copyImage, makeTitle, saveImage } from "../utils/helpers";
import { Prediction } from "../types";

export const Single = ({ prediction }: { prediction: Prediction }) => {
  const { input, output, metrics, id } = prediction;
  const markdown = prediction
    ? `
  ### ${input?.prompt?.trim() ?? "No prompt provided"}

  ![${input?.prompt?.trim() ?? ""}](${output[0]})`
    : null;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action icon={Icon.SaveDocument} title="Save Image" onAction={() => saveImage(output[0])} />
          <Action icon={Icon.Image} title="Copy Image" onAction={() => copyImage(output[0])} />
          <Action.OpenInBrowser
            icon={Icon.Globe}
            title="Open on Replicate"
            url={`https://replicate.com/p/${id.split("-")[0]}`}
          />
          {input?.prompt && (
            <Action.CopyToClipboard icon={Icon.Text} title="Copy Prompt" content={input?.prompt.trim()} />
          )}
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Predict time">
            {metrics?.predict_time && (
              <Detail.Metadata.TagList.Item text={String(metrics.predict_time)} color={"#fff791"} />
            )}
          </Detail.Metadata.TagList>
          {Object.entries(input).map(([title, value]) => {
            if (title === "prompt") return null;
            return <Detail.Metadata.Label key={title} title={makeTitle(title)} text={String(value)} />;
          })}
        </Detail.Metadata>
      }
    />
  );
};
