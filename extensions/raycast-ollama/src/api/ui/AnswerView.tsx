import {
  ModelType,
  OllamaApiGenerateRequestBody,
  OllamaApiGenerateResponse,
  OllamaApiTagsResponseModel,
} from "../types";
import {
  ErrorOllamaCustomModel,
  ErrorOllamaModelNotInstalled,
  ErrorRaycastApiNoTextSelectedOrCopied,
  ErrorRaycastApiNoTextSelected,
  ErrorRaycastApiNoTextCopied,
  ErrorRaycastModelNotConfiguredOnLocalStorage,
  ErrorOllamaModelNotMultimodal,
} from "../errors";
import { OllamaApiGenerate, OllamaApiVersion } from "../ollama";
import { SetModelView } from "./SetModelView";
import * as React from "react";
import { Action, ActionPanel, Detail, Icon, LocalStorage, Toast, showToast } from "@raycast/api";
import { getSelectedText, Clipboard, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { GetImage, GetModel, VerifyOllamaVersion } from "../common";

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
  ["image-describe", "Describe the content on the following images.\n"],
  ["image-to-text", "Extract all the text from the following images.\n"],
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

interface props {
  prompt?: string;
  command?: string;
  image?: boolean;
  model?: string;
}

/**
 * Return JSX element with generated text and relative metadata.
 * @param {string} command - Command name.
 * @param {string | undefined} systemPrompt - System Prompt.
 * @param {string | undefined} model - Model used for inference.
 * @returns {JSX.Element} Raycast Answer View.
 */
export function AnswerView(props: props): JSX.Element {
  const { data: OllamaVersion, isLoading: IsLoadingOllamaVersion } = usePromise(OllamaApiVersion, [], {
    onError: HandleError,
  });
  const {
    data: ModelGenerate,
    revalidate: RevalidateModelGenerate,
    isLoading: IsLoadingModelGenerate,
  } = usePromise(GetModel, [props.command, props.image, props.model, ModelType.GENERATE], {
    onError: HandleError,
  });
  const [loading, setLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(false);
  const [imageView, setImageView]: [string, React.Dispatch<React.SetStateAction<string>>] = React.useState("");
  const [answer, setAnswer]: [string, React.Dispatch<React.SetStateAction<string>>] = React.useState("");
  const [answerMetadata, setAnswerMetadata]: [
    OllamaApiGenerateResponse,
    React.Dispatch<React.SetStateAction<OllamaApiGenerateResponse>>
  ] = React.useState({} as OllamaApiGenerateResponse);
  const [showAnswerMetadata, setShowAnswerMetadata] = React.useState(false);

  /**
   * Handle Error from Ollama API.
   * @param {Error} err - Error object.
   * @returns {Promise<void>}
   */
  async function HandleError(err: Error): Promise<void> {
    if (
      err instanceof ErrorOllamaModelNotInstalled ||
      err instanceof ErrorOllamaModelNotMultimodal ||
      err === ErrorRaycastModelNotConfiguredOnLocalStorage
    ) {
      if (err instanceof ErrorOllamaModelNotInstalled || err instanceof ErrorOllamaModelNotMultimodal)
        await showToast({ style: Toast.Style.Failure, title: err.message, message: err.suggest });
      if (err === ErrorRaycastModelNotConfiguredOnLocalStorage)
        await showToast({ style: Toast.Style.Failure, title: err.message });
      if (!props.model) setShowSelectModelForm(true);
      return;
    } else if (err instanceof ErrorOllamaCustomModel) {
      await showToast({
        style: Toast.Style.Failure,
        title: err.message,
        message: `Model: ${err.model}, File: ${err.file}`,
      });
      return;
    } else {
      await showToast({ style: Toast.Style.Failure, title: err.message });
    }
  }

  /**
   * Start Inference with Ollama API.
   * @param {string} query - Query.
   * @param {string[]} images - Images.
   * @returns {Promise<void>}
   */
  async function Inference(query: string, images: string[] | undefined = undefined): Promise<void> {
    await showToast({ style: Toast.Style.Animated, title: "🧠 Performing Inference." });
    setLoading(true);
    const body = {
      model: ModelGenerate?.name,
      prompt: query,
      images: images,
    } as OllamaApiGenerateRequestBody;
    if (props.command) body.system = defaultPrompt.get(props.command);
    if (props.prompt) body.system = props.prompt;
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
   * Run Command
   */
  async function Run() {
    if (ModelGenerate) {
      setImageView("");
      setAnswer("");
      switch (props.image) {
        case true: {
          if (OllamaVersion && VerifyOllamaVersion(OllamaVersion, "0.1.15")) {
            const image = await GetImage().catch(async (err) => {
              showToast({ style: Toast.Style.Failure, title: err });
              return [];
            });
            if (image.length > 0) {
              image.forEach((i) => {
                setImageView((prevState) => prevState + i.html);
              });
              setImageView((prevState) => prevState + "\n");
              Inference(
                " ",
                image.map((i) => i.base64)
              );
            }
          } else {
            await showToast({
              style: Toast.Style.Failure,
              title: "Ollama API version is outdated, at least v0.1.15 is required for this feature.",
            });
          }
          break;
        }
        default:
          switch (preferences.ollamaResultViewInput) {
            case "SelectedText":
              getSelectedText()
                .then((text) => {
                  Inference(text);
                })
                .catch(async () => {
                  if (preferences.ollamaResultViewInputFallback) {
                    Clipboard.readText()
                      .then((text) => {
                        if (text === undefined) throw "Empty Clipboard";
                        Inference(text);
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
                  Inference(text);
                })
                .catch(async () => {
                  if (preferences.ollamaResultViewInputFallback) {
                    getSelectedText()
                      .then((text) => {
                        Inference(text);
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
      }
    }
  }

  React.useEffect(() => {
    Run();
  }, [ModelGenerate]);

  const [showSelectModelForm, setShowSelectModelForm]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(false);

  React.useEffect(() => {
    if (!showSelectModelForm) RevalidateModelGenerate();
  }, [showSelectModelForm]);

  if (showSelectModelForm && props.command)
    return (
      <SetModelView
        Command={props.command}
        ShowModelView={setShowSelectModelForm}
        Families={props.image ? ["clip"] : undefined}
      />
    );

  /**
   * Answer Action Menu.
   * @returns {JSX.Element}
   */
  function AnswerAction(): JSX.Element {
    return (
      <ActionPanel title="Actions">
        <Action.CopyToClipboard content={answer} />
        <Action
          title={showAnswerMetadata ? "Hide Metadata" : "Show Metadata"}
          icon={showAnswerMetadata ? Icon.EyeDisabled : Icon.Eye}
          shortcut={{ modifiers: ["cmd"], key: "y" }}
          onAction={() => setShowAnswerMetadata((prevState) => !prevState)}
        />
        <Action title="Retry" onAction={Run} shortcut={{ modifiers: ["cmd"], key: "r" }} icon={Icon.Repeat} />
        {props.command && (
          <Action
            title="Change Model"
            icon={Icon.Box}
            onAction={() => setShowSelectModelForm(true)}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
          />
        )}
      </ActionPanel>
    );
  }

  /**
   * Answer Metadata.
   * @param prop
   * @returns {JSX.Element}
   */
  function AnswerMetadata(prop: { answer: OllamaApiGenerateResponse; tag: OllamaApiTagsResponseModel }): JSX.Element {
    return (
      <Detail.Metadata>
        <Detail.Metadata.Label title="Model" text={prop.tag.name} />
        <Detail.Metadata.Label title="Family" text={prop.tag.details.family} />
        {prop.tag.details.families && prop.tag.details.families.length > 0 && (
          <Detail.Metadata.TagList title="Families">
            {prop.tag.details.families.map((f) => (
              <Detail.Metadata.TagList.Item text={f} />
            ))}
          </Detail.Metadata.TagList>
        )}
        <Detail.Metadata.Label title="Parameter Size" text={prop.tag.details.parameter_size} />
        <Detail.Metadata.Label title="Quantization Level" text={prop.tag.details.quantization_level} />
        <Detail.Metadata.Separator />
        {prop.answer.eval_count && prop.answer.eval_duration ? (
          <Detail.Metadata.Label
            title="Generation Speed"
            text={`${(prop.answer.eval_count / (prop.answer.eval_duration / 1e9)).toFixed(2)} token/s`}
          />
        ) : null}
        {prop.answer.total_duration ? (
          <Detail.Metadata.Label
            title="Total Inference Duration"
            text={`${(prop.answer.total_duration / 1e9).toFixed(2)}s`}
          />
        ) : null}
        {prop.answer.load_duration ? (
          <Detail.Metadata.Label title="Load Duration" text={`${(prop.answer.load_duration / 1e9).toFixed(2)}s`} />
        ) : null}
        {prop.answer.prompt_eval_count ? (
          <Detail.Metadata.Label title="Prompt Eval Count" text={`${prop.answer.prompt_eval_count}`} />
        ) : null}
        {prop.answer.prompt_eval_duration ? (
          <Detail.Metadata.Label
            title="Prompt Eval Duration"
            text={`${(prop.answer.prompt_eval_duration / 1e9).toFixed(2)}s`}
          />
        ) : null}
        {prop.answer.eval_count ? (
          <Detail.Metadata.Label title="Eval Count" text={`${prop.answer.eval_count}`} />
        ) : null}
        {prop.answer.eval_duration ? (
          <Detail.Metadata.Label title="Eval Duration" text={`${(prop.answer.eval_duration / 1e9).toFixed(2)}s`} />
        ) : null}
      </Detail.Metadata>
    );
  }

  return (
    <Detail
      markdown={`${imageView}${answer}`}
      isLoading={loading || IsLoadingModelGenerate || IsLoadingOllamaVersion}
      actions={!loading && !IsLoadingModelGenerate && <AnswerAction />}
      metadata={
        !loading &&
        !IsLoadingModelGenerate &&
        ModelGenerate &&
        answerMetadata &&
        showAnswerMetadata && <AnswerMetadata answer={answerMetadata} tag={ModelGenerate} />
      }
    />
  );
}
