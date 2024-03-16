import {
  ModelType,
  OllamaApiGenerateRequestBody,
  OllamaApiGenerateResponse,
  OllamaApiTagsResponseModel,
  RaycastImage,
} from "../types";
import {
  ErrorOllamaCustomModel,
  ErrorOllamaModelNotInstalled,
  ErrorRaycastModelNotConfiguredOnLocalStorage,
  ErrorOllamaModelNotMultimodal,
} from "../errors";
import { OllamaApiGenerate, OllamaApiVersion } from "../ollama";
import { SetModelView } from "./SetModelView";
import * as React from "react";
import { Action, ActionPanel, Detail, Icon, Toast, showToast } from "@raycast/api";
import { getSelectedText, Clipboard, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { GetImage, GetModel, VerifyOllamaVersion } from "../common";

const preferences = getPreferenceValues();

interface props {
  prompt: string;
  command?: string;
  image?: boolean;
  model?: string;
}

/**
 * Return JSX element with generated text and relative metadata.
 * @param {string} props.command - Command name.
 * @param {string | undefined} props.systemPrompt - System Prompt.
 * @param {string | undefined} props.model - Model used for inference.
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
      await showToast({
        style: Toast.Style.Failure,
        title: err.message,
        message:
          err instanceof ErrorOllamaModelNotInstalled || err instanceof ErrorOllamaModelNotMultimodal
            ? err.suggest
            : undefined,
      });
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
   * Verify required Ollama version based on used tags.
   *
   * @returns {Promise<boolean>} Return `false` if installed Ollama Version doesn't meat minimum required version otherwise `true`.
   */
  async function InferenceVerifyOllamaVersion(): Promise<boolean> {
    const OllamaVersionMin = props.image ? "0.1.15" : "0.1.14";
    if (OllamaVersion && !VerifyOllamaVersion(OllamaVersion, OllamaVersionMin)) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Ollama API version is outdated, at least ${OllamaVersionMin} is required.`,
      });
      return false;
    }
    return true;
  }

  /**
   * Verify required Model capabilities.
   *
   * @param {PromptTags | undefined} tag - Tag used on prompt.
   * @returns {Promise<boolean>} Return `false` if required Model is not installed or configured.
   */
  async function InferenceVerifyModel(): Promise<boolean> {
    switch (props.image) {
      case true:
        if (!ModelGenerate || !ModelGenerate.details.families.find((f) => f === "clip")) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Model with Vision capabilities required",
          });
          return false;
        }
        break;
      default:
        if (!ModelGenerate) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Model not configured",
          });
          return false;
        }
        break;
    }
    return true;
  }

  /**
   * Get Images from Finder if no file is selected fallback to Clipboard.
   *
   * @returns {Promise<RaycastImage[] | undefined>}
   */
  async function InferenceTagImage(): Promise<RaycastImage[] | undefined> {
    return await GetImage().catch(async (err) => {
      showToast({ style: Toast.Style.Failure, title: err.message });
      return undefined;
    });
  }

  /**
   * Get Selected Text.
   *
   * @param {boolean} fallback - set to `true` for enable fallback to clipboard.
   * @returns {Promise<string | undefined>}
   */
  async function InferenceGetSelectedText(fallback = false): Promise<string | undefined> {
    return await getSelectedText().catch(async (e) => {
      await showToast({
        style: Toast.Style.Failure,
        title: "No selected text found",
        message: fallback ? "fallback to clipboard" : undefined,
      });
      if (fallback) return await InferenceGetClipboardText();
      return undefined;
    });
  }

  /**
   * Get Clipboard Text.
   *
   * @param {boolean} fallback - set to `true` for enable fallback to selected text.
   * @returns {Promise<string | undefined>}
   */
  async function InferenceGetClipboardText(fallback = false): Promise<string | undefined> {
    let c = await Clipboard.readText().catch(async (e) => {
      return undefined;
    });
    if (!c) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No text found on clipboard",
        message: fallback ? "fallback to selected text" : undefined,
      });
      if (fallback) c = await InferenceGetSelectedText();
    }
    return c;
  }

  /**
   * Get Query for inference.
   *
   * @returns {string | undefined}
   */
  async function InferenceGetQuery(): Promise<string | undefined> {
    let query: string | undefined;
    switch (preferences.ollamaResultViewInput) {
      case "SelectedText":
        query = await InferenceGetSelectedText(preferences.ollamaResultViewInputFallback);
        break;
      case "Clipboard":
        query = await InferenceGetClipboardText(preferences.ollamaResultViewInputFallback);
        break;
    }
    return query;
  }

  /**
   * Start Inference with Ollama API.
   * @param {string} query - Query.
   * @param {string[]} images - Images.
   * @returns {Promise<void>}
   */
  async function Inference(query: string, images: string[] | undefined = undefined): Promise<void> {
    await showToast({ style: Toast.Style.Animated, title: "🧠 Inference." });
    const body = {
      model: ModelGenerate?.name,
      prompt: query,
      images: images,
    } as OllamaApiGenerateRequestBody;
    body.system = props.prompt;
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
    setLoading(true);

    // Check required Ollama Version.
    if (!(await InferenceVerifyOllamaVersion())) {
      setLoading(false);
      return;
    }

    // Check Model is Configured
    if (!(await InferenceVerifyModel())) {
      setLoading(false);
      if (!props.model) setShowSelectModelForm(true);
      return;
    }

    // Loading Images if required
    let images: RaycastImage[] | undefined;
    if (props.image) {
      images = await InferenceTagImage();
      if (!images) {
        setLoading(false);
        return;
      }
      setImageView("");
      images.forEach((i) => {
        setImageView((prevState) => prevState + i.html);
      });
      setImageView((prevState) => prevState + "\n");
    }

    // Loading query
    let query: string | undefined;
    if (!props.image) {
      query = await InferenceGetQuery();
      if (!query) {
        setLoading(false);
        return;
      }
    }

    // Start Inference
    setAnswer("");
    await Inference(query ? query : " ", images ? images.map((i) => i.base64) : undefined);
  }

  React.useEffect(() => {
    if (ModelGenerate && !IsLoadingModelGenerate) Run();
  }, [ModelGenerate, IsLoadingModelGenerate]);

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
