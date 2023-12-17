import { OllamaApiGenerateRequestBody, OllamaApiGenerateResponse } from "../types";
import {
  ErrorOllamaCustomModel,
  ErrorOllamaModelNotInstalled,
  ErrorRaycastApiNoTextSelectedOrCopied,
  ErrorRaycastApiNoTextSelected,
  ErrorRaycastApiNoTextCopied,
  ErrorRaycastModelNotConfiguredOnLocalStorage,
} from "../errors";
import { OllamaApiGenerate } from "../ollama";
import { SetModelView } from "./SetModelView";
import * as React from "react";
import { Action, ActionPanel, Detail, Icon, LocalStorage, Toast, showToast } from "@raycast/api";
import { getSelectedText, Clipboard, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";

const preferences = getPreferenceValues();

const defaultPrompt = new Map([
  [
    "casual",
    "Act as a writer. Make the following text more casual while keeping the core idea.\n\nOutput only with the modified text.\n",
  ],
  [
    "codeexplain",
    "Act as a developer. Explain the following code block step by step.\n\nOutput only with the commented code.\n",
  ],
  [
    "confident",
    "Act as a writer. Make the following text more confident while keeping the core idea.\n\nOutput only with the modified text.\n",
  ],
  [
    "explain",
    "Act as a writer. Explain the following text in simple and concise terms.\n\nOutput only with the modified text.\n",
  ],
  [
    "fix",
    "Act as a writer. Fix the following text from spelling and grammar error.\n\nOutput only with the fixed text.\n",
  ],
  [
    "friendly",
    "Act as a writer. Make the following text more friendly while keeping the core idea.\n\nOutput only with the modified text.\n",
  ],
  [
    "improve",
    "Act as a writer. Improve the writing of the following text while keeping the core idea.\n\nOutput only with the modified text.\n",
  ],
  [
    "longher",
    "Act as a writer. Make the following text longer and more rich while keeping the core idea.\n\nOutput only with the modified text.\n",
  ],
  [
    "professional",
    "Act as a writer. Make the following text more professional while keeping the core idea.\n\nOutput only with the modified text.\n",
  ],
  [
    "shorter",
    "Act as a writer. Make the following text shorter while keeping the core idea.\n\nOutput only with the modified text.\n",
  ],
  ["translate", "Act as a translator. Translate the following text.\n\nOutput only with the translated text.\n"],
  [
    "tweet",
    "You are a content marketer who needs to come up with a short but succinct tweet. Make sure to include the appropriate hashtags and links. All answers should be in the form of a tweet which has a max size of 280 characters. Every instruction will be the topic to create a tweet about.\n\nOutput only with the modified text.\n",
  ],
]);

/**
 * Return JSX element with generated text and relative metadata.
 * @param {string} command - Command name.
 * @param {string | undefined} systemPrompt - System Prompt.
 * @param {string | undefined} model - Model used for inference.
 * @returns {JSX.Element} Raycast Answer View.
 */
export function AnswerView(
  command: string | undefined = undefined,
  model: string | undefined = undefined
): JSX.Element {
  // Main
  const query: React.MutableRefObject<string> = React.useRef("");
  const { data: ModelGenerate, revalidate: RevalidateModelGenerate } = usePromise(GetModel, [], {
    onError: () => {
      setShowSelectModelForm(true);
    },
  });
  const [loading, setLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(false);
  const [answer, setAnswer]: [string, React.Dispatch<React.SetStateAction<string>>] = React.useState("");
  const [answerMetadata, setAnswerMetadata]: [
    OllamaApiGenerateResponse,
    React.Dispatch<React.SetStateAction<OllamaApiGenerateResponse>>
  ] = React.useState({} as OllamaApiGenerateResponse);

  /**
   * Handle Error from Ollama API.
   * @param {Error} err - Error object.
   * @returns {Promise<void>}
   */
  async function HandleError(err: Error): Promise<void> {
    if (err instanceof ErrorOllamaModelNotInstalled) {
      await showToast({ style: Toast.Style.Failure, title: err.message, message: err.suggest });
      setLoading(false);
      setShowSelectModelForm(true);
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
  }

  /**
   * Start Inference with Ollama API.
   * @returns {Promise<void>}
   */
  async function Inference(): Promise<void> {
    await showToast({ style: Toast.Style.Animated, title: "🧠 Performing Inference." });
    setLoading(true);
    setAnswer("");
    const body = {
      model: ModelGenerate,
      prompt: query.current,
    } as OllamaApiGenerateRequestBody;
    if (command) body.system = defaultPrompt.get(command);
    OllamaApiGenerate(body)
      .then(async (emiter) => {
        emiter.on("data", (data) => {
          setAnswer((prevState) => prevState + data);
        });

        emiter.on("done", async (data) => {
          await showToast({ style: Toast.Style.Success, title: "🧠 Inference Done." });
          setAnswerMetadata(data);
          setLoading(false);
        });
      })
      .catch(async (err) => {
        await HandleError(err);
      });
  }

  /**
   * Get Model from LocalStorage.
   * @returns {Promise<string>} Model.
   */
  async function GetModel(): Promise<string> {
    if (model) {
      return model;
    } else {
      const m = await LocalStorage.getItem(`${command}_model_generate`);
      if (m) {
        return m as string;
      } else {
        throw ErrorRaycastModelNotConfiguredOnLocalStorage;
      }
    }
  }

  // When Model is set or changed start inference.
  React.useEffect(() => {
    if (ModelGenerate)
      switch (preferences.ollamaResultViewInput) {
        case "SelectedText":
          getSelectedText()
            .then((text) => {
              query.current = text;
              Inference();
            })
            .catch(async () => {
              if (preferences.ollamaResultViewInputFallback) {
                Clipboard.readText()
                  .then((text) => {
                    if (text === undefined) throw "Empty Clipboard";
                    query.current = text;
                    Inference();
                  })
                  .catch(async () => {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: ErrorRaycastApiNoTextSelectedOrCopied.message,
                    });
                  });
              } else {
                await showToast({ style: Toast.Style.Failure, title: ErrorRaycastApiNoTextSelected.message });
              }
            });
          break;
        case "Clipboard":
          Clipboard.readText()
            .then((text) => {
              if (text === undefined) throw "Empty Clipboard";
              query.current = text;
              Inference();
            })
            .catch(async () => {
              if (preferences.ollamaResultViewInputFallback) {
                getSelectedText()
                  .then((text) => {
                    query.current = text;
                    Inference();
                  })
                  .catch(async () => {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: ErrorRaycastApiNoTextSelectedOrCopied.message,
                    });
                  });
              } else {
                await showToast({ style: Toast.Style.Failure, title: ErrorRaycastApiNoTextCopied.message });
              }
            });
          break;
      }
  }, [ModelGenerate]);

  const [showSelectModelForm, setShowSelectModelForm]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(false);

  // Revalidate ModelGenerate when model is changed with SwtModelView Form
  React.useEffect(() => {
    if (!showSelectModelForm) RevalidateModelGenerate();
  }, [showSelectModelForm]);

  if (showSelectModelForm && command) return <SetModelView Command={command} ShowModelView={setShowSelectModelForm} />;

  return (
    <Detail
      markdown={answer}
      isLoading={loading}
      actions={
        !loading && (
          <ActionPanel title="Actions">
            <Action.CopyToClipboard content={answer} />
            <Action title="Retry" onAction={Inference} shortcut={{ modifiers: ["cmd"], key: "r" }} icon={Icon.Repeat} />
            <Action
              title="Change Model"
              icon={Icon.Box}
              onAction={() => setShowSelectModelForm(true)}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
            />
          </ActionPanel>
        )
      }
      metadata={
        !loading &&
        preferences.ollamaShowMetadata && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Model" text={answerMetadata.model} />
            <Detail.Metadata.Separator />
            {answerMetadata.eval_count && answerMetadata.eval_duration ? (
              <Detail.Metadata.Label
                title="Generation Speed"
                text={`${(answerMetadata.eval_count / (answerMetadata.eval_duration / 1e9)).toFixed(2)} token/s`}
              />
            ) : null}
            {answerMetadata.total_duration ? (
              <Detail.Metadata.Label
                title="Total Inference Duration"
                text={`${(answerMetadata.total_duration / 1e9).toFixed(2)}s`}
              />
            ) : null}
            {answerMetadata.load_duration ? (
              <Detail.Metadata.Label
                title="Load Duration"
                text={`${(answerMetadata.load_duration / 1e9).toFixed(2)}s`}
              />
            ) : null}
            {answerMetadata.prompt_eval_count ? (
              <Detail.Metadata.Label title="Prompt Eval Count" text={`${answerMetadata.prompt_eval_count}`} />
            ) : null}
            {answerMetadata.prompt_eval_duration ? (
              <Detail.Metadata.Label
                title="Prompt Eval Duration"
                text={`${(answerMetadata.prompt_eval_duration / 1e9).toFixed(2)}s`}
              />
            ) : null}
            {answerMetadata.eval_count ? (
              <Detail.Metadata.Label title="Eval Count" text={`${answerMetadata.eval_count}`} />
            ) : null}
            {answerMetadata.eval_duration ? (
              <Detail.Metadata.Label
                title="Eval Duration"
                text={`${(answerMetadata.eval_duration / 1e9).toFixed(2)}s`}
              />
            ) : null}
          </Detail.Metadata>
        )
      }
    />
  );
}
