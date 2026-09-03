import * as React from "react";
import { Action, ActionPanel, Detail, getPreferenceValues, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { convertExchangesToChat, GetModel, Run, GetPromptTokenSelectionText } from "./function";
import { Shortcut } from "../shortcut";
import { CommandAnswer } from "../../settings/enum";
import { OllamaApiGenerateResponse, OllamaApiTagsResponseModel, ThinkingEffort } from "../../ollama/types";
import { EditModel } from "./form/EditModel";
import { Creativity, ModelCapability } from "../../enum";
import { RaycastImage } from "../../types";
import { ChatView } from "../ChatView/main";

interface props {
  prompt: string;
  command?: CommandAnswer;
  server?: string;
  model?: string;
  capabilities?: ModelCapability[];
  creativity?: Creativity;
  thinking?: ThinkingEffort;
  keep_alive?: string;
  promptValues?: Record<string, string>;
  query?: string;
}

interface Exchange {
  query: string;
  answer: string;
  thinking: string;
  metadata?: OllamaApiGenerateResponse;
  images?: RaycastImage[];
}

export function AnswerView(props: props): React.JSX.Element {
  const { push } = useNavigation();
  const {
    data: Model,
    revalidate: RevalidateModel,
    isLoading: IsLoadingModel,
  } = usePromise(GetModel, [props.command, props.server, props.model], {
    onError: (e) => {
      const pref = getPreferenceValues<Preferences>();
      const hasFallback = pref.ollamaUseDefaultModelAsFallback && pref.ollamaDefaultModel;
      if (
        !hasFallback &&
        (e.message === "Settings for this Command unavailable" ||
          e.message === "Model unavailable on given server" ||
          e.message == "Verify Ollama is Installed and Currently Running.")
      )
        setShowSelectModelForm(true);
      showToast({ style: Toast.Style.Failure, title: e.message });
    },
  });

  const [loading, setLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(false);
  const query: React.MutableRefObject<undefined | string> = React.useRef(undefined);
  const images: React.MutableRefObject<undefined | RaycastImage[]> = React.useRef(undefined);
  const [showAnswerMetadata, setShowAnswerMetadata] = React.useState(false);

  const [exchanges, setExchanges] = React.useState<Exchange[]>([]);

  const setThinking = (value: React.SetStateAction<string>) => {
    setExchanges((prev) => {
      const next = [...prev];
      if (next.length === 0) return prev;
      const current = next[next.length - 1];
      const newThinking = typeof value === "function" ? value(current.thinking) : value;
      next[next.length - 1] = { ...current, thinking: newThinking };
      return next;
    });
  };

  const setAnswer = (value: React.SetStateAction<string>) => {
    setExchanges((prev) => {
      const next = [...prev];
      if (next.length === 0) return prev;
      const current = next[next.length - 1];
      const newAnswer = typeof value === "function" ? value(current.answer) : value;
      next[next.length - 1] = { ...current, answer: newAnswer };
      return next;
    });
  };

  const setAnswerMetadata = (value: React.SetStateAction<OllamaApiGenerateResponse>) => {
    setExchanges((prev) => {
      const next = [...prev];
      if (next.length === 0) return prev;
      const current = next[next.length - 1];
      const newMetadata =
        typeof value === "function" ? value((current.metadata || {}) as OllamaApiGenerateResponse) : value;
      next[next.length - 1] = { ...current, metadata: newMetadata };
      return next;
    });
  };

  const setImageView = () => {
    // Handled directly via exchanges images prop
  };

  React.useEffect(() => {
    if (Model && !IsLoadingModel && exchanges.length === 0) {
      let promptToRun = Model.prompt !== undefined ? Model.prompt : props.prompt;
      if (props.query) {
        const regex = /{[ ]*selection[ ]*}/gi;
        promptToRun = promptToRun.replace(regex, props.query);
      }
      if (props.promptValues) {
        for (const [key, value] of Object.entries(props.promptValues)) {
          const regex = new RegExp(`{[ ]*${key}[ ]*}`, "gi");
          promptToRun = promptToRun.replace(regex, value);
        }
      }

      const fetchSelectionAndRun = async () => {
        let selectionText = props.query;
        if (!selectionText) {
          try {
            selectionText = await GetPromptTokenSelectionText();
          } catch {
            // ignore
          }
        }

        // Add the initial exchange
        const initialExchange: Exchange = {
          query: selectionText || "Quick AI Request",
          answer: "",
          thinking: "",
        };
        setExchanges([initialExchange]);

        setLoading(true);
        try {
          await Run(
            Model,
            promptToRun,
            query,
            images,
            setLoading,
            setImageView,
            setThinking,
            setAnswer,
            setAnswerMetadata,
            props.creativity,
            props.thinking ? props.thinking : Model.thinking,
            props.keep_alive ? props.keep_alive : Model.keep_alive,
          );
          setExchanges((prev) => {
            if (prev.length === 0) return prev;
            const next = [...prev];
            next[0] = { ...next[0], images: images.current };
            return next;
          });
        } catch (e) {
          await showToast({ style: Toast.Style.Failure, title: "Error", message: String(e) });
          setLoading(false);
        }
      };

      fetchSelectionAndRun();
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
        capabilities={props.capabilities}
        server={!IsLoadingModel && Model ? Model.server.name : undefined}
        model={!IsLoadingModel && Model ? Model.tag.name : undefined}
        thinking={!IsLoadingModel && Model ? Model.thinking : undefined}
        keep_alive={!IsLoadingModel && Model ? Model.keep_alive : undefined}
        prompt={!IsLoadingModel && Model && Model.prompt !== undefined ? Model.prompt : props.prompt}
        action={!IsLoadingModel && Model ? Model.action : undefined}
      />
    );

  const handleRegenerateExchange = async () => {
    if (!Model || loading) return;

    setLoading(true);

    // Clear the answer and thinking for the selected exchange
    setExchanges((prev) => {
      const next = [...prev];
      if (next[0]) {
        next[0] = { ...next[0], answer: "", thinking: "" };
      }
      return next;
    });

    let promptToRun = Model.prompt !== undefined ? Model.prompt : props.prompt;
    if (props.query) {
      const regex = /{[ ]*selection[ ]*}/gi;
      promptToRun = promptToRun.replace(regex, props.query);
    }
    if (props.promptValues) {
      for (const [key, value] of Object.entries(props.promptValues)) {
        const regex = new RegExp(`{[ ]*${key}[ ]*}`, "gi");
        promptToRun = promptToRun.replace(regex, value);
      }
    }

    const onThinking = (value: React.SetStateAction<string>) => {
      setExchanges((prev) => {
        const next = [...prev];
        if (next.length === 0) return prev;
        const current = next[0];
        const newThinking = typeof value === "function" ? value(current.thinking) : value;
        next[0] = { ...current, thinking: newThinking };
        return next;
      });
    };

    const onAnswer = (value: React.SetStateAction<string>) => {
      setExchanges((prev) => {
        const next = [...prev];
        if (next.length === 0) return prev;
        const current = next[0];
        const newAnswer = typeof value === "function" ? value(current.answer) : value;
        next[0] = { ...current, answer: newAnswer };
        return next;
      });
    };

    const onAnswerMetadata = (value: React.SetStateAction<OllamaApiGenerateResponse>) => {
      setExchanges((prev) => {
        const next = [...prev];
        if (next.length === 0) return prev;
        const current = next[0];
        const newMetadata =
          typeof value === "function" ? value((current.metadata || {}) as OllamaApiGenerateResponse) : value;
        next[0] = { ...current, metadata: newMetadata };
        return next;
      });
    };

    Run(
      Model,
      promptToRun,
      query,
      images,
      setLoading,
      setImageView,
      onThinking,
      onAnswer,
      onAnswerMetadata,
      props.creativity,
      props.thinking ? props.thinking : Model.thinking,
      props.keep_alive ? props.keep_alive : Model.keep_alive,
    )
      .then(() => {
        setExchanges((prev) => {
          if (prev.length === 0) return prev;
          const next = [...prev];
          next[0] = { ...next[0], images: images.current };
          return next;
        });
      })
      .catch(async (e) => {
        await showToast({ style: Toast.Style.Failure, title: "Error", message: e });
        setLoading(false);
      });
  };

  /**
   * Answer Metadata.
   * @param prop.answer - Ollama Generate Response.
   * @param prop.tag - Ollama Model Tag Response.
   */
  function AnswerMetadata(prop: {
    answer: OllamaApiGenerateResponse;
    tag: OllamaApiTagsResponseModel;
  }): React.JSX.Element {
    return (
      <Detail.Metadata>
        <Detail.Metadata.Label title="Model" text={prop.tag.name} />
        <Detail.Metadata.Label title="Family" text={prop.tag.details.family} />
        {prop.tag.details.families && prop.tag.details.families.length > 0 && (
          <Detail.Metadata.TagList title="Families">
            {prop.tag.details.families.map((f) => (
              <Detail.Metadata.TagList.Item text={f} key={f} />
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

  function AnswerAction(): React.JSX.Element {
    const item = exchanges[0];
    return (
      <ActionPanel title="Actions">
        {item && <Action.Paste content={item.answer} />}
        {item && <Action.CopyToClipboard shortcut={Shortcut.Copy} content={item.answer} />}
        {item && !loading && (
          <Action
            title="Regenerate"
            icon={Icon.ArrowClockwise}
            shortcut={Shortcut.Regenerate}
            onAction={handleRegenerateExchange}
          />
        )}
        <Action
          title={showAnswerMetadata ? "Hide Metadata" : "Show Metadata"}
          icon={showAnswerMetadata ? Icon.EyeDisabled : Icon.Eye}
          shortcut={Shortcut.ToggleQuickLook}
          onAction={() => setShowAnswerMetadata((prevState) => !prevState)}
        />
        {props.command && (
          <Action
            title="Change Model"
            icon={Icon.Box}
            onAction={() => setShowSelectModelForm(true)}
            shortcut={Shortcut.ChangeModel}
          />
        )}
        {Model && !loading && item && item.answer && (
          <Action
            title="Continue as Chat"
            icon={Icon.SpeechBubble}
            onAction={async () => {
              await convertExchangesToChat(Model, exchanges, props.thinking);
              push(<ChatView />);
            }}
            shortcut={Shortcut.New}
          />
        )}
      </ActionPanel>
    );
  }

  const item = exchanges[0];
  if (!item || (item.thinking === "" && item.answer === "")) {
    return <Detail isLoading={loading || IsLoadingModel} actions={!IsLoadingModel && <AnswerAction />} markdown="" />;
  }

  const imgHtml = item.images ? item.images.map((i) => i.html).join(" ") + "\n" : "";
  return (
    <Detail
      markdown={`${imgHtml}
${
  item.thinking !== ""
    ? `
<details>
<summary><b>💡 Thinking... (click to expand)</b></summary>

${item.thinking}

</details>
`
    : ``
}
${item.answer}`}
      isLoading={loading || IsLoadingModel}
      actions={!IsLoadingModel && <AnswerAction />}
      metadata={
        !loading &&
        !IsLoadingModel &&
        Model &&
        item.metadata &&
        showAnswerMetadata && <AnswerMetadata answer={item.metadata} tag={Model.tag} />
      }
    />
  );
}
