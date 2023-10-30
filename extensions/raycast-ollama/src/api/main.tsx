import {
  OllamaApiGenerateRequestBody,
  OllamaApiGenerateResponseDone,
  OllamaApiGenerateResponseMetadata,
} from "./types";
import {
  ErrorOllamaCustomModel,
  ErrorOllamaModelNotInstalled,
  ErrorRaycastApiNoTextSelectedOrCopied,
  ErrorRaycastApiNoTextSelected,
  ErrorRaycastApiNoTextCopied,
} from "./errors";
import { OllamaApiGenerate, OllamaApiTags } from "./ollama";
import * as React from "react";
import { Action, ActionPanel, Detail, Form, Icon, List, LocalStorage, Toast, showToast } from "@raycast/api";
import { getSelectedText, Clipboard, getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();

/**
 * Return JSX element with generated text and relative metadata.
 * @param {string} command - Command name.
 * @param {string | undefined} systemPrompt - System Prompt.
 * @param {string | undefined} model - Model used for inference.
 * @returns {JSX.Element} Raycast Detail View.
 */
export function ResultView(
  command = "",
  systemPrompt: string | undefined = undefined,
  model: string | undefined = undefined
): JSX.Element {
  // Main
  const [modelGenerate, setModelGenerate]: [
    string | undefined,
    React.Dispatch<React.SetStateAction<string | undefined>>
  ] = React.useState();
  const query: React.MutableRefObject<string> = React.useRef("");
  const [loading, setLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(false);
  const [answer, setAnswer]: [string, React.Dispatch<React.SetStateAction<string>>] = React.useState("");
  const [answerMetadata, setAnswerMetadata]: [
    OllamaApiGenerateResponseMetadata,
    React.Dispatch<React.SetStateAction<OllamaApiGenerateResponseMetadata>>
  ] = React.useState({} as OllamaApiGenerateResponseMetadata);
  async function HandleError(err: Error) {
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
  async function Inference(): Promise<void> {
    await showToast({ style: Toast.Style.Animated, title: "🧠 Performing Inference." });
    setLoading(true);
    setAnswer("");
    const body = {
      model: modelGenerate,
      prompt: query.current,
    } as OllamaApiGenerateRequestBody;
    if (systemPrompt) body.system = systemPrompt;
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
  async function GetModels(): Promise<void> {
    const generate = await LocalStorage.getItem(`${command}_model_generate`);
    if (generate) {
      setModelGenerate(generate as string);
    } else {
      setShowSelectModelForm(true);
    }
  }
  React.useEffect(() => {
    if (modelGenerate)
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
  }, [modelGenerate]);
  React.useEffect(() => {
    if (model) {
      setModelGenerate(model);
    } else {
      GetModels();
    }
  }, []);

  // Form: Select Model
  const [showSelectModelForm, setShowSelectModelForm]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(false);
  const [installedModels, setInstalledModels]: [string[], React.Dispatch<React.SetStateAction<string[]>>] =
    React.useState([] as string[]);
  async function setLocalStorageModels(generate: string) {
    LocalStorage.setItem(`${command}_model_generate`, generate);
    setModelGenerate(generate);
    setShowSelectModelForm(false);
  }
  async function getInstalledModels() {
    const installedModels: string[] | undefined = await OllamaApiTags()
      .then((response): string[] => {
        const installedModels: string[] = [];
        response.models.map((model) => {
          installedModels.push(model.name);
        });
        return installedModels;
      })
      .catch(async (err): Promise<undefined> => {
        await showToast({ style: Toast.Style.Failure, title: err.message });
        return undefined;
      });
    if (installedModels) setInstalledModels([...installedModels]);
  }
  React.useEffect(() => {
    if (showSelectModelForm && installedModels.length === 0) getInstalledModels();
  }, [showSelectModelForm]);
  const FormSetModel: JSX.Element = (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={(values) => setLocalStorageModels(values.modelGenerate)} />
          <Action.Open
            title="Manage Models"
            icon={Icon.Box}
            target="raycast://extensions/massimiliano_pasquini/raycast-ollama/ollama-models"
            shortcut={{ modifiers: ["cmd"], key: "m" }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="modelGenerate" title="Model" defaultValue={modelGenerate}>
        {installedModels.map((model) => {
          return <Form.Dropdown.Item value={model} title={model} key={model} />;
        })}
      </Form.Dropdown>
    </Form>
  );

  if (showSelectModelForm) return FormSetModel;

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
            <Detail.Metadata.Label
              title="Generation Speed"
              text={`${(answerMetadata.eval_count / (answerMetadata.eval_duration / 1e9)).toFixed(2)} token/s`}
            />
            <Detail.Metadata.Label
              title="Total Inference Duration"
              text={`${(answerMetadata.total_duration / 1e9).toFixed(2)}s`}
            />
            <Detail.Metadata.Label title="Load Duration" text={`${(answerMetadata.load_duration / 1e9).toFixed(2)}s`} />
            <Detail.Metadata.Label title="Sample Duration" text={`${answerMetadata.sample_count} sample`} />
            <Detail.Metadata.Label
              title="Sample Duration"
              text={`${(answerMetadata.sample_duration / 1e9).toFixed(2)}s`}
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

/**
 * Return JSX element with generated text on list view.
 * @returns {JSX.Element} Raycast List View.
 */
export function ListView(): JSX.Element {
  // Main
  const modelGenerate: React.MutableRefObject<string | undefined> = React.useRef();
  const [loading, setLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(false);
  const [query, setQuery]: [string, React.Dispatch<React.SetStateAction<string>>] = React.useState("");
  const [chatName, setChatName]: [string, React.Dispatch<React.SetStateAction<string>>] = React.useState("Current");
  const [selectedAnswer, setSelectedAnswer]: [string, React.Dispatch<React.SetStateAction<string>>] =
    React.useState("0");
  const [answerListHistory, setAnswerListHistory]: [
    Map<string, [string, string, OllamaApiGenerateResponseDone][] | undefined>,
    React.Dispatch<React.SetStateAction<Map<string, [string, string, OllamaApiGenerateResponseDone][] | undefined>>>
  ] = React.useState(new Map());
  const [clipboardConversation, setClipboardConversation]: [string, React.Dispatch<React.SetStateAction<string>>] =
    React.useState("");
  async function HandleError(err: Error) {
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
  async function Inference(): Promise<void> {
    await showToast({ style: Toast.Style.Animated, title: "🧠 Performing Inference." });
    setLoading(true);
    const body = {
      model: modelGenerate.current,
      prompt: query,
    } as OllamaApiGenerateRequestBody;
    if (answerListHistory.has(chatName)) {
      const l = answerListHistory.get(chatName)?.length;
      if (l && l > 0) {
        body.context = answerListHistory.get(chatName)?.[l - 1][2].context;
      }
    }
    setQuery("");
    OllamaApiGenerate(body)
      .then(async (emiter) => {
        setAnswerListHistory((prevState) => {
          let prevData = prevState.get(chatName);
          if (prevData?.length === undefined) {
            prevData = [[query, "", {} as OllamaApiGenerateResponseDone]];
          } else {
            prevData.push([query, "", {} as OllamaApiGenerateResponseDone]);
          }
          prevState.set(chatName, prevData);
          setSelectedAnswer((prevData.length - 1).toString());
          return new Map(prevState);
        });

        emiter.on("data", (data) => {
          setAnswerListHistory((prevState) => {
            const prevData = prevState.get(chatName);
            if (prevData) {
              if (prevData?.length) prevData[prevData.length - 1][1] += data;
              prevState.set(chatName, prevData);
            }
            return new Map(prevState);
          });
        });

        emiter.on("done", async (data) => {
          await showToast({ style: Toast.Style.Success, title: "🧠 Inference Done." });
          setAnswerListHistory((prevState) => {
            const prevData = prevState.get(chatName);
            if (prevData) {
              if (prevData?.length) prevData[prevData.length - 1][2] = data;
              prevState.set(chatName, prevData);
            }
            return new Map(prevState);
          });
          setLoading(false);
        });
      })
      .catch(async (err) => {
        await HandleError(err);
      });
  }
  async function SaveAnswerListHistory(): Promise<void> {
    const currentData = answerListHistory.get(chatName);
    if (currentData && currentData[currentData.length - 1][2].context) {
      await LocalStorage.setItem("answerListHistory", JSON.stringify([...answerListHistory]));
    }
  }
  async function GetAnswerList(): Promise<void> {
    await LocalStorage.getItem("chatName").then((data) => {
      if (data) setChatName(data as string);
    });
    await LocalStorage.getItem("answerListHistory").then((data) => {
      if (data) {
        const dataMap: Map<string, [string, string, OllamaApiGenerateResponseDone][]> = new Map(
          JSON.parse(data as string)
        );
        setAnswerListHistory(dataMap);
      }
    });
  }
  async function GetModels(): Promise<void> {
    const generate = await LocalStorage.getItem("chat_model_generate");
    if (generate) {
      modelGenerate.current = generate as string;
    } else {
      setShowSelectModelForm(true);
    }
  }
  async function ClearAnswerList(): Promise<void> {
    setAnswerListHistory((prevState) => {
      if (chatName === "Current") {
        prevState.set("Current", undefined);
      } else {
        prevState.delete(chatName);
      }
      return new Map(prevState);
    });
    if (answerListHistory.size === 0) {
      await LocalStorage.removeItem("answerListHistory");
    }
    setChatName("Current");
    await LocalStorage.setItem("chatName", "Current");
    await LocalStorage.setItem("answerListHistory", JSON.stringify([...answerListHistory]));
  }
  async function ChangeChat(name: string): Promise<void> {
    setChatName(name);
    setClipboardConversationByName(name);
    await LocalStorage.setItem("chatName", name);
  }
  function setClipboardConversationByName(name: string) {
    let clipboard = "";
    const data = answerListHistory.get(name);
    if (data) {
      data.map((value) => (clipboard += `Question:\n${value[0]}\n\nAnswer:${value[1]}\n\n`));
    }
    setClipboardConversation(clipboard);
  }
  function ActionOllama(item?: [string, string, OllamaApiGenerateResponseDone]): JSX.Element {
    return (
      <ActionPanel>
        <ActionPanel.Section title="Ollama">
          {query && <Action title="Get Answer" icon={Icon.SpeechBubbleActive} onAction={Inference} />}
          {item?.[0] && (
            <Action.CopyToClipboard
              title="Copy Question"
              content={item[0] as string}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
            />
          )}
          {item?.[1] && (
            <Action.CopyToClipboard
              title="Copy Answer"
              content={item[1] as string}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
          {item && <Action.CopyToClipboard title="Copy Conversation" content={clipboardConversation} />}
          {chatName === "Current" && item && (
            <Action
              title="Archive Conversation"
              icon={Icon.Box}
              onAction={() => setShowFormSaveChat(true)}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
          )}
          {item && (
            <Action
              title="Clear Conversation"
              icon={Icon.Trash}
              onAction={ClearAnswerList}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          )}
          <Action
            title="Change Model"
            icon={Icon.Box}
            onAction={() => setShowSelectModelForm(true)}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
          />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }
  React.useEffect(() => {
    SaveAnswerListHistory();
    setClipboardConversationByName(chatName);
  }, [answerListHistory]);
  React.useEffect(() => {
    GetAnswerList();
    GetModels();
  }, []);

  // Form: Save Chat
  const [showFormSaveChat, setShowFormSaveChat]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(false);
  async function SaveChatToHistory(): Promise<void> {
    setAnswerListHistory((prevState) => {
      const chat = prevState.get("Current");
      if (chat) {
        prevState.set(chatName, chat);
        prevState.set("Current", undefined);
      }
      return new Map(prevState);
    });
    setChatName("Current");
    await LocalStorage.setItem("chatName", "Current");
    await LocalStorage.setItem("answerListHistory", JSON.stringify([...answerListHistory]));
    setShowFormSaveChat(false);
  }
  const FormSaveChat: JSX.Element = (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={SaveChatToHistory} title="Save Conversation" />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="chatName"
        title="Chat Name"
        placeholder="Enter Chat Name"
        value={chatName}
        onChange={setChatName}
      />
    </Form>
  );

  // Form: Select Model
  const [showSelectModelForm, setShowSelectModelForm]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(false);
  const [installedModels, setInstalledModels]: [string[], React.Dispatch<React.SetStateAction<string[]>>] =
    React.useState([] as string[]);
  async function setLocalStorageModels(generate: string) {
    LocalStorage.setItem(`chat_model_generate`, generate);
    modelGenerate.current = generate;
    setShowSelectModelForm(false);
  }
  async function getInstalledModels() {
    const installedModels: string[] | undefined = await OllamaApiTags()
      .then((response): string[] => {
        const installedModels: string[] = [];
        response.models.map((model) => {
          installedModels.push(model.name);
        });
        return installedModels;
      })
      .catch(async (err): Promise<undefined> => {
        await showToast({ style: Toast.Style.Failure, title: err.message });
        return undefined;
      });
    if (installedModels) setInstalledModels([...installedModels]);
  }
  React.useEffect(() => {
    if (showSelectModelForm && installedModels.length === 0) getInstalledModels();
  }, [showSelectModelForm]);
  const FormSetModel: JSX.Element = (
    <Form
      actions={
        <ActionPanel>
          {installedModels.length > 0 && (
            <Action.SubmitForm title="Submit" onSubmit={(values) => setLocalStorageModels(values.modelGenerate)} />
          )}
          <Action.Open
            title="Manage Models"
            icon={Icon.Box}
            target="raycast://extensions/massimiliano_pasquini/raycast-ollama/ollama-models"
            shortcut={{ modifiers: ["cmd"], key: "m" }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="modelGenerate" title="Model" defaultValue={modelGenerate.current}>
        {installedModels.map((model) => {
          return <Form.Dropdown.Item value={model} title={model} key={model} />;
        })}
      </Form.Dropdown>
    </Form>
  );

  if (showSelectModelForm) return FormSetModel;

  if (showFormSaveChat) return FormSaveChat;

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Ask..."
      searchText={query}
      onSearchTextChange={setQuery}
      selectedItemId={selectedAnswer}
      actions={!loading && ActionOllama()}
      isShowingDetail={
        answerListHistory.get(chatName)?.length != undefined && (answerListHistory.get(chatName)?.length as number) > 0
      }
      searchBarAccessory={
        <List.Dropdown tooltip="Chat History" value={chatName} onChange={ChangeChat}>
          {!loading &&
            Array.from(answerListHistory.keys()).map((key) => <List.Dropdown.Item key={key} title={key} value={key} />)}
        </List.Dropdown>
      }
    >
      {(() => {
        if (
          answerListHistory.get(chatName)?.length != undefined &&
          (answerListHistory.get(chatName)?.length as number) > 0
        ) {
          return answerListHistory.get(chatName)?.map((item, index) => (
            <List.Item
              icon={Icon.Message}
              title={item[0]}
              key={index}
              id={index.toString()}
              actions={!loading && ActionOllama(item)}
              detail={
                <List.Item.Detail
                  markdown={`${item[1]}`}
                  metadata={
                    preferences.ollamaShowMetadata &&
                    item[2].context && (
                      <Detail.Metadata>
                        <Detail.Metadata.Label title="Model" text={item[2].model} />
                        <Detail.Metadata.Separator />
                        <Detail.Metadata.Label
                          title="Generation Speed"
                          text={`${(item[2].eval_count / (item[2].eval_duration / 1e9)).toFixed(2)} token/s`}
                        />
                        <Detail.Metadata.Label
                          title="Total Inference Duration"
                          text={`${(item[2].total_duration / 1e9).toFixed(2)}s`}
                        />
                        <Detail.Metadata.Label
                          title="Load Duration"
                          text={`${(item[2].load_duration / 1e9).toFixed(2)}s`}
                        />
                        <Detail.Metadata.Label title="Sample Duration" text={`${item[2].sample_count} sample`} />
                        <Detail.Metadata.Label
                          title="Sample Duration"
                          text={`${(item[2].sample_duration / 1e9).toFixed(2)}s`}
                        />
                        <Detail.Metadata.Label title="Prompt Eval Count" text={`${item[2].prompt_eval_count}`} />
                        <Detail.Metadata.Label
                          title="Prompt Eval Duration"
                          text={`${(item[2].prompt_eval_duration / 1e9).toFixed(2)}s`}
                        />
                        <Detail.Metadata.Label title="Eval Count" text={`${item[2].eval_count}`} />
                        <Detail.Metadata.Label
                          title="Eval Duration"
                          text={`${(item[2].eval_duration / 1e9).toFixed(2)}s`}
                        />
                      </Detail.Metadata>
                    )
                  }
                />
              }
            />
          ));
        }
        return <List.EmptyView icon={Icon.Message} title="Start a Conversation with Ollama" />;
      })()}
    </List>
  );
}
