import { Action, Icon, showToast, Toast } from "@raycast/api";
import { fileURLToPath } from "node:url";
import { isSaved } from "../lib/history";
import { Prediction } from "../types";
import { cancelPrediction, errorMessage } from "../lib/replicate";
import { copyOutputFile, saveOutputFile } from "../utils/helpers";
import { OutputItem, firstFile, firstText, kindLabel } from "../utils/output";
import { isRunning } from "../utils/status";

type Props = {
  prediction: Prediction;
  items: OutputItem[];
  revalidate: () => void;
};
export const PredictionActions = ({ prediction, items, revalidate }: Props) => {
  const file = firstFile(items);
  const text = firstText(items);
  const prompt = prediction.input?.prompt?.trim();

  const cancel = async () => {
    const toast = await showToast(Toast.Style.Animated, "Cancelling...");
    try {
      await cancelPrediction(prediction.id);
      toast.style = Toast.Style.Success;
      toast.title = "Prediction Canceled";
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could Not Cancel the Prediction";
      toast.message = errorMessage(error);
    }
  };

  const savedPath = file && isSaved(file.url) ? fileURLToPath(file.url) : undefined;

  return (
    <>
      {savedPath && <Action.ShowInFinder path={savedPath} />}
      {file && (
        <Action
          icon={Icon.CopyClipboard}
          title={`Copy ${kindLabel(file.kind)}`}
          onAction={() => copyOutputFile(file.url)}
        />
      )}
      {file && (
        <Action
          icon={Icon.SaveDocument}
          title={`Save ${kindLabel(file.kind)}`}
          onAction={() => saveOutputFile(file.url)}
        />
      )}
      {savedPath && <Action.Open icon={Icon.Eye} title={`Open ${kindLabel(file.kind)}`} target={savedPath} />}
      {file && !savedPath && (
        <Action.OpenInBrowser icon={Icon.Eye} title={`Open ${kindLabel(file.kind)}`} url={file.url} />
      )}
      {text && <Action.CopyToClipboard icon={Icon.Text} title="Copy Output" content={text.text} />}
      <Action.OpenInBrowser
        icon={Icon.Globe}
        title="Open on Replicate"
        url={`https://replicate.com/p/${prediction.id}`}
      />
      {prompt && <Action.CopyToClipboard icon={Icon.Paragraph} title="Copy Prompt" content={prompt} />}
      {isRunning(prediction) && (
        <Action icon={Icon.Stop} style={Action.Style.Destructive} title="Cancel Prediction" onAction={cancel} />
      )}
      <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={revalidate} />
    </>
  );
};
