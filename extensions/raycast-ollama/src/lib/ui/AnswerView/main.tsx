import * as React from "react";
import { Action, ActionPanel, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { GetModel, Run } from "./function";
import { CommandAnswer } from "../../settings/enum";
import { OllamaApiGenerateResponse, OllamaApiTagsResponseModel } from "../../ollama/types";
import { EditModel } from "./form/EditModel";
import { Creativity } from "../../enum";

interface props {
  prompt: string;
  command?: CommandAnswer;
  server?: string;
  model?: string;
  creativity?: Creativity;
  keep_alive?: string;
}

/**
 * Return JSX element with generated text and relative metadata.
 * @param props.command - Command Type.
 * @param props.systemPrompt - System Prompt.
 * @param props.server - Ollama Server Name.
 * @param props.model - Ollama Model Tag Name.
 * @returns Raycast Answer View.
 */
export function AnswerView(props: props): JSX.Element {
  const {
    data: Model,
    revalidate: RevalidateModel,
    isLoading: IsLoadingModel,
  } = usePromise(GetModel, [props.command, props.server, props.model], {
    onError: (e) => {
      if (
        String(e) === "Settings for this Command unavailable" ||
        String(e) === "Model unavailable on given server" ||
        String(e) == "Error: Verify Ollama is Installed and Currently Running."
      )
        setShowSelectModelForm(true);
      showToast({ style: Toast.Style.Failure, title: String(e) });
    },
  });
  const [loading, setLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(false);
  const [imageView, setImageView]: [string, React.Dispatch<React.SetStateAction<string>>] = React.useState("");
  const [answer, setAnswer]: [string, React.Dispatch<React.SetStateAction<string>>] = React.useState("");
  const [answerMetadata, setAnswerMetadata]: [
    OllamaApiGenerateResponse,
    React.Dispatch<React.SetStateAction<OllamaApiGenerateResponse>>
  ] = React.useState({} as OllamaApiGenerateResponse);
  const [showAnswerMetadata, setShowAnswerMetadata] = React.useState(false);

  React.useEffect(() => {
    if (Model && !IsLoadingModel) {
      Run(
        Model,
        props.prompt,
        setLoading,
        setImageView,
        setAnswer,
        setAnswerMetadata,
        props.creativity,
        props.keep_alive ? props.keep_alive : Model.keep_alive
      ).catch(async (e) => {
        await showToast({ style: Toast.Style.Failure, title: "Error", message: e });
        setLoading(false);
      });
    }
  }, [Model, IsLoadingModel]);

  const [showSelectModelForm, setShowSelectModelForm]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(false);

  React.useEffect(() => {
    if (!showSelectModelForm) RevalidateModel();
  }, [showSelectModelForm]);

  if (showSelectModelForm && props.command)
    return (
      <EditModel
        command={props.command}
        setShow={setShowSelectModelForm}
        revalidate={RevalidateModel}
        server={!IsLoadingModel && Model ? Model.server.name : undefined}
        model={!IsLoadingModel && Model ? Model.tag.name : undefined}
        keep_alive={!IsLoadingModel && Model ? Model.keep_alive : undefined}
      />
    );

  /**
   * Answer Action Menu.
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
   * @param prop.answer - Ollama Generate Response.
   * @param prop.tag - Ollama Model Tag Response.
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

  if (answer === "")
    return (
      <List isLoading={loading || IsLoadingModel}>
        {""}
        <List.EmptyView icon={Icon.CircleProgress} title="Loading Model" />
      </List>
    );

  return (
    <Detail
      markdown={`${imageView}${answer}`}
      isLoading={loading || IsLoadingModel}
      actions={!loading && !IsLoadingModel && <AnswerAction />}
      metadata={
        !loading &&
        !IsLoadingModel &&
        Model &&
        answerMetadata &&
        showAnswerMetadata && <AnswerMetadata answer={answerMetadata} tag={Model.tag} />
      }
    />
  );
}
