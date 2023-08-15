import {
  OllamaApiEmbeddingsResponse,
  OllamaApiGenerateRequestBody,
  OllamaApiGenerateResponseDone,
  OllamaApiGenerateResponseMetadata,
} from "./types";
import { ErrorOllamaCustomModel, ErrorOllamaModelNotInstalled, ErrorRaycastApiNoTextSelected } from "./errors";
import { OllamaApiEmbeddings, OllamaApiGenerate } from "./ollama";
import * as React from "react";
import { Action, ActionPanel, Detail, Form, Icon, List, LocalStorage, Toast, showToast } from "@raycast/api";
import { getSelectedText, getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();

/**
 * Return JSX element with generated text and relative metadata.
 * @param {OllamaApiGenerateRequestBody} body - Ollama Generate Body Request.
 * @param {boolean} selectText - If true, get text from selected text.
 * @param {boolean} embeddings - If true, use embeddings.
 * @param {string} embeddingsModel - Model used for embeddings. By default use same model for inference.
 * @returns {JSX.Element} Raycast Detail View.
 */
export function ResultView(
  body: OllamaApiGenerateRequestBody,
  selectText: boolean,
  embeddings = false,
  embeddingsModel = body.model
): JSX.Element {
  const [embeddingsResponse, setEmbeddingsResponse]: [
    OllamaApiEmbeddingsResponse,
    React.Dispatch<React.SetStateAction<OllamaApiEmbeddingsResponse>>
  ] = React.useState({} as OllamaApiEmbeddingsResponse);
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

  async function Embeddings(text: string): Promise<void> {
    await showToast({ style: Toast.Style.Animated, title: "🧠 Performing Embeddings." });
    setLoading(true);
    await OllamaApiEmbeddings(text, embeddingsModel)
      .then((response) => {
        setLoading(false);
        setEmbeddingsResponse(response);
      })
      .catch(async (err) => {
        await HandleError(err);
      });
  }

  React.useEffect(() => {
    if (selectText && !embeddings) {
      getSelectedText()
        .then((selectedText) => {
          body.prompt = selectedText;
          Inference();
        })
        .catch(async (err) => {
          await showToast({ style: Toast.Style.Failure, title: ErrorRaycastApiNoTextSelected.message });
          console.error(err);
        });
    } else if (!selectText) {
      Inference();
    }
  }, []);

  React.useEffect(() => {
    if (selectText && embeddings) {
      getSelectedText()
        .then((selectedText) => {
          Embeddings(selectedText);
        })
        .catch(async (err) => {
          await showToast({ style: Toast.Style.Failure, title: ErrorRaycastApiNoTextSelected.message });
          console.error(err);
        });
    }
  }, []);

  React.useEffect(() => {
    if (embeddingsResponse.embedding) {
      //Inference();
    }
  }, [embeddingsResponse]);

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
        !loading &&
        preferences.ollamaShowMetadata && (
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

/**
 * Return JSX element with generated text on list view.
 * @param {OllamaApiGenerateRequestBody} body - Ollama Generate Body Request.
 * @returns {JSX.Element} Raycast List View.
 */
export function ListView(body: OllamaApiGenerateRequestBody): JSX.Element {
  const [loading, setLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(false);
  const [query, setQuery]: [string, React.Dispatch<React.SetStateAction<string>>] = React.useState("");
  const [chatName, setChatName]: [string, React.Dispatch<React.SetStateAction<string>>] = React.useState("Current");
  const [selectedAnswer, setSelectedAnswer]: [string, React.Dispatch<React.SetStateAction<string>>] =
    React.useState("0");
  const [answerListHistory, setAnswerListHistory]: [
    Map<string, [string, string, OllamaApiGenerateResponseDone][] | undefined>,
    React.Dispatch<React.SetStateAction<Map<string, [string, string, OllamaApiGenerateResponseDone][] | undefined>>>
  ] = React.useState(new Map());
  const [showForm, setShowForm]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(false);
  const [clipboardConversation, setClipboardConversation]: [string, React.Dispatch<React.SetStateAction<string>>] =
    React.useState("");

  async function HandleError(err: Error) {
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
  }

  async function Inference(): Promise<void> {
    await showToast({ style: Toast.Style.Animated, title: "🧠 Performing Inference." });
    setLoading(true);
    body.prompt = query;
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
    setShowForm(false);
  }

  async function ChangeChat(name: string): Promise<void> {
    setChatName(name);
    setClipboardConversationByName(name);
    await LocalStorage.setItem("chatName", name);
  }

  function showFormView(): void {
    setShowForm(true);
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
              onAction={showFormView}
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
  }, []);

  if (showForm)
    return (
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

  return (
    <List
      isLoading={loading}
      navigationTitle="Ask..."
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
          return answerListHistory
            .get(chatName)
            ?.map((item, index) => (
              <List.Item
                icon={Icon.Message}
                title={item[0]}
                key={index}
                id={index.toString()}
                actions={!loading && ActionOllama(item)}
                detail={<List.Item.Detail markdown={`${item[1]}`} />}
              />
            ));
        }
        return <List.EmptyView icon={Icon.Message} title="Start a Conversation with Ollama" />;
      })()}
    </List>
  );
}
