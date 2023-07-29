import { OllamaApiGenerateResponseMetadata } from "./types";
import { ErrorOllamaCustomModel, ErrorOllamaModelNotInstalled, ErrorRaycastApiNoTextSelected } from "./errors";
import { OllamaApiGenerate } from "./ollama";
import * as React from "react";
import { Action, ActionPanel, Detail, Icon, Toast, showToast } from "@raycast/api";
import { getSelectedText } from "@raycast/api";

/**
 * Return JSX element with generated text and relative metadata.
 * @param {string} model - Model used for inference.
 * @param {string} initialPrompt - Initial prompt for inference.
 * @param {string} endPrompt - End tag prompt.
 * @param {boolean} selectText - If true, get text from selected text.
 * @returns {JSX.Element} Raycast Detail View.
 */
export default function ResultView(
  model: string,
  initialPrompt: string,
  endPrompt: string,
  selectText: boolean
): JSX.Element {
  const [loading, setLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(false);
  const [answer, setAnswer]: [string, React.Dispatch<React.SetStateAction<string>>] = React.useState("");
  const [answerMetadata, setAnswerMetadata]: [
    OllamaApiGenerateResponseMetadata,
    React.Dispatch<React.SetStateAction<OllamaApiGenerateResponseMetadata>>
  ] = React.useState({} as OllamaApiGenerateResponseMetadata);
  let text = "";

  async function Inference(): Promise<void> {
    await showToast({ style: Toast.Style.Animated, title: "🧠 Performing Inference." });
    setLoading(true);
    OllamaApiGenerate(initialPrompt + text + endPrompt, model)
      .then(async (data) => {
        await showToast({ style: Toast.Style.Success, title: "🧠 Inference Done." });
        setAnswer(data.answer);
        setAnswerMetadata(data.metadata);
        setLoading(false);
      })
      .catch(async (err) => {
        if (err instanceof ErrorOllamaModelNotInstalled) {
          await showToast({ style: Toast.Style.Failure, title: err.message, message: err.suggest });
          setLoading(false);
          return;
        } else if (err instanceof ErrorOllamaCustomModel) {
          await showToast({
            style: Toast.Style.Failure,
            title: err.message,
            message: `Model: ${err.model}, File: ${err.file}`,
          });
          setLoading(false);
          return;
        } else {
          await showToast({ style: Toast.Style.Failure, title: err.message });
          setLoading(false);
        }
      });
  }

  React.useEffect(() => {
    if (selectText) {
      getSelectedText()
        .then((selectedText) => {
          text = selectedText;
          Inference();
        })
        .catch(async (err) => {
          await showToast({ style: Toast.Style.Failure, title: ErrorRaycastApiNoTextSelected.message });
          console.error(err);
        });
    } else {
      Inference();
    }
  }, []);

  return (
    <Detail
      markdown={answer}
      isLoading={loading}
      actions={
        !loading && (
          <ActionPanel title="Actions">
            <Action.CopyToClipboard content={answer} />
            <Action title="Retry" onAction={Inference} shortcut={{ modifiers: ["cmd"], key: "r" }} icon={Icon.Repeat} />
          </ActionPanel>
        )
      }
      metadata={
        !loading && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Model" text={answerMetadata.model} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Total Inference Duration"
              text={`${(answerMetadata.total_duration / 1e9).toFixed(2)}s`}
            />
            <Detail.Metadata.Label title="Prompt Eval Count" text={`${answerMetadata.prompt_eval_count}`} />
            <Detail.Metadata.Label
              title="Prompt Eval Duration"
              text={`${(answerMetadata.prompt_eval_duration / 1e9).toFixed(2)}s`}
            />
            <Detail.Metadata.Label title="Eval Count" text={`${answerMetadata.eval_count}`} />
            <Detail.Metadata.Label title="Eval Duration" text={`${(answerMetadata.eval_duration / 1e9).toFixed(2)}s`} />
          </Detail.Metadata>
        )
      }
    />
  );
}
