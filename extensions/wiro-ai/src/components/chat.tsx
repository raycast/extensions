import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise, useCachedState } from "@raycast/utils";
import { randomUUID } from "node:crypto";
import { useEffect, useRef, useState } from "react";
import { listChatModels, streamChat, type ChatMessage, type ChatModel, type ChatUsage } from "../lib/gateway";
import { credentials, projectScope } from "../lib/preferences";
import { modelPageUrl } from "../lib/wiro";

const DEFAULT_MODELS = ["openai/gpt-5-4-mini", "google/gemini-3-5-flash", "deepseek/v4-flash"];
const HISTORY_TURNS = 20;
const KEPT_EXCHANGES = 50;

interface Exchange {
  id: string;
  question: string;
  answer: string;
  model: string;
  askedAt: number;
  usage?: ChatUsage;
  error?: string;
}

function ownerTitle(owner: string): string {
  const names: Record<string, string> = {
    openai: "OpenAI",
    claude: "Anthropic",
    google: "Google",
    deepseek: "DeepSeek",
    xai: "xAI",
    "meta-llama": "Meta",
    mistralai: "Mistral AI",
    moonshot: "Moonshot AI",
    glm: "Z.ai",
    bytedance: "ByteDance",
    qwen: "Qwen",
  };
  return (
    names[owner] ??
    owner.replace(/(^|-)([a-z])/g, (_, dash: string, letter: string) => `${dash ? " " : ""}${letter.toUpperCase()}`)
  );
}

function groupByOwner(models: ChatModel[]): Array<[string, ChatModel[]]> {
  const groups = new Map<string, ChatModel[]>();
  for (const model of models) {
    const owner = model.id.split("/")[0] ?? "";
    groups.set(owner, [...(groups.get(owner) ?? []), model]);
  }
  return [...groups.entries()];
}

function perMillion(price: number | undefined): string | undefined {
  if (price === undefined) return undefined;
  const value = price * 1_000_000;
  return `$${value < 1 ? value.toFixed(2) : value.toFixed(value < 10 ? 2 : 1)}`;
}

function conversationMarkdown(exchanges: Exchange[]): string {
  return [...exchanges]
    .reverse()
    .filter((exchange) => exchange.answer)
    .map((exchange) => `**You:** ${exchange.question}\n\n**${exchange.model}:** ${exchange.answer}`)
    .join("\n\n---\n\n");
}

interface ChatProps {
  initialQuestion?: string;
  initialModel?: string;
}

export function Chat({ initialQuestion, initialModel }: ChatProps) {
  // Kept per project: after a key change, a conversation is never sent with another project's key.
  const scope = projectScope();
  const [exchanges, setExchanges] = useCachedState<Exchange[]>(`chat-exchanges-${scope}`, []);
  const [sessionId, setSessionId] = useCachedState<string>(`chat-session-${scope}`, "");
  const [storedModel, setStoredModel] = useCachedState<string>("chat-model", "");
  const [chosenModel, setChosenModel] = useState<string | undefined>(initialModel);
  const [searchText, setSearchText] = useState(initialQuestion?.trim() ?? "");
  const [selectedId, setSelectedId] = useState<string>();
  const [streaming, setStreaming] = useState<{ id: string; text: string }>();
  const abortRef = useRef<AbortController | undefined>(undefined);
  const askingRef = useRef(false);
  const askedInitial = useRef(false);

  const {
    data: models,
    isLoading: modelsLoading,
    error: modelsError,
    revalidate: reloadModels,
  } = useCachedPromise(listChatModels, [], {
    keepPreviousData: true,
    failureToastOptions: { title: "Could not load the models" },
  });

  const available = models ?? [];
  const preferred =
    chosenModel ||
    (storedModel && (available.length === 0 || available.some((model) => model.id === storedModel))
      ? storedModel
      : undefined);
  const model =
    preferred ||
    DEFAULT_MODELS.find((id) => available.some((candidate) => candidate.id === id)) ||
    available[0]?.id ||
    "";
  const modelInfo = available.find((candidate) => candidate.id === model);
  const busy = streaming !== undefined;

  useEffect(() => () => abortRef.current?.abort(), []);

  async function ask(rawQuestion: string, options: { fresh?: boolean } = {}) {
    const question = rawQuestion.trim();
    if (!question || askingRef.current) return;
    if (!model) {
      if (modelsError) {
        await showFailureToast(modelsError, {
          title: "Could not load the models",
          primaryAction: { title: "Try Again", onAction: () => reloadModels() },
        });
      } else {
        await showFailureToast(new Error("The model list has not loaded yet. Try again in a moment."), {
          title: "No model selected",
        });
      }
      return;
    }

    askingRef.current = true;
    let session = options.fresh ? "" : sessionId;
    if (!session) {
      session = randomUUID();
      setSessionId(session);
    }
    const previous = options.fresh ? [] : exchanges;
    const history: ChatMessage[] = [...previous]
      .reverse()
      .filter((exchange) => exchange.answer && !exchange.error)
      .slice(-HISTORY_TURNS)
      .flatMap((exchange) => [
        { role: "user" as const, content: exchange.question },
        { role: "assistant" as const, content: exchange.answer },
      ]);

    const exchange: Exchange = { id: randomUUID(), question, answer: "", model, askedAt: Date.now() };
    setExchanges((current) => [exchange, ...(options.fresh ? [] : current)].slice(0, KEPT_EXCHANGES));
    setSelectedId(exchange.id);
    setSearchText("");
    setStreaming({ id: exchange.id, text: "" });

    const controller = new AbortController();
    abortRef.current = controller;
    let partial = "";
    try {
      const result = await streamChat({
        model,
        messages: [...history, { role: "user", content: question }],
        credentials: credentials(),
        sessionId: `raycast-${session}`,
        signal: controller.signal,
        onText: (text) => {
          partial = text;
          setStreaming({ id: exchange.id, text });
        },
      });
      setExchanges((current) =>
        current.map((item) => (item.id === exchange.id ? { ...item, answer: result.text, usage: result.usage } : item)),
      );
    } catch (error) {
      const stopped = controller.signal.aborted;
      const message = stopped ? "Stopped." : error instanceof Error ? error.message : String(error);
      setExchanges((current) =>
        current.map((item) =>
          item.id === exchange.id
            ? { ...item, answer: partial, error: stopped && partial ? undefined : message }
            : item,
        ),
      );
      if (!stopped) await showFailureToast(error, { title: "Could not get an answer" });
    } finally {
      abortRef.current = undefined;
      askingRef.current = false;
      setStreaming(undefined);
    }
  }

  useEffect(() => {
    if (askedInitial.current || !initialQuestion?.trim() || !model) return;
    askedInitial.current = true;
    ask(initialQuestion, { fresh: true });
  }, [initialQuestion, model]);

  async function newConversation() {
    if (exchanges.length > 0) {
      const confirmed = await confirmAlert({
        title: "Start a new conversation?",
        message: "The questions and answers of this conversation are deleted from Raycast.",
        primaryAction: { title: "Start New Conversation", style: Alert.ActionStyle.Destructive },
      });
      if (!confirmed) return;
    }
    abortRef.current?.abort();
    setExchanges([]);
    setSessionId(randomUUID());
    setSelectedId(undefined);
    setStreaming(undefined);
  }

  function chooseModel(next: string) {
    if (!next || next === model) return;
    setChosenModel(next);
    setStoredModel(next);
  }

  const answerOf = (exchange: Exchange) => (streaming?.id === exchange.id ? streaming.text : exchange.answer);

  const sendAction = searchText.trim() ? (
    <Action
      title="Send Message"
      icon={Icon.Message}
      onAction={() =>
        busy
          ? showToast({
              style: Toast.Style.Failure,
              title: "Wait for the answer first",
              message: "Stop Answer ends it",
            })
          : ask(searchText)
      }
    />
  ) : undefined;

  const commonActions = (
    <>
      {busy && (
        <Action
          title="Stop Answer"
          icon={Icon.Stop}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={() => abortRef.current?.abort()}
        />
      )}
      <Action
        title="New Conversation"
        icon={Icon.PlusCircle}
        style={Action.Style.Destructive}
        shortcut={Keyboard.Shortcut.Common.New}
        onAction={newConversation}
      />
      {model && <Action.OpenInBrowser title="Open Model Page" icon={Icon.Globe} url={modelPageUrl(model)} />}
    </>
  );

  const rootActions = (
    <ActionPanel>
      {sendAction}
      {commonActions}
    </ActionPanel>
  );

  const dropdownModels = available.length > 0 ? available : model ? [{ id: model, name: model } as ChatModel] : [];

  return (
    <List
      isLoading={modelsLoading || busy}
      isShowingDetail={exchanges.length > 0}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={busy ? "Waiting for the answer…" : "Ask a question and press Enter"}
      selectedItemId={selectedId}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
      searchBarAccessory={
        dropdownModels.length > 0 ? (
          <List.Dropdown tooltip="Model" value={model} onChange={chooseModel}>
            {groupByOwner(dropdownModels).map(([owner, group]) => (
              <List.Dropdown.Section key={owner} title={ownerTitle(owner)}>
                {group.map((item) => (
                  <List.Dropdown.Item key={item.id} value={item.id} title={item.id} keywords={[item.name]} />
                ))}
              </List.Dropdown.Section>
            ))}
          </List.Dropdown>
        ) : undefined
      }
      actions={rootActions}
    >
      {exchanges.length === 0 && modelsError && available.length === 0 && !modelsLoading ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not load the models"
          description={modelsError.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={() => reloadModels()} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : exchanges.length === 0 ? (
        <List.EmptyView
          actions={rootActions}
          icon={{ source: "extension-icon.png" }}
          title="Ask Wiro AI"
          description={
            modelInfo
              ? `Type a question and press Enter. ${modelInfo.name} answers; pick another model from the dropdown.`
              : "Type a question and press Enter. Pick the model from the dropdown."
          }
        />
      ) : (
        exchanges.map((exchange) => {
          const answer = answerOf(exchange);
          const waiting = streaming?.id === exchange.id && !answer;
          const markdown = [
            `**${exchange.question.replace(/\n+/g, " ")}**`,
            waiting ? "_Thinking…_" : answer,
            exchange.error ? `**Error:** ${exchange.error}` : "",
          ]
            .filter(Boolean)
            .join("\n\n");
          const info = available.find((candidate) => candidate.id === exchange.model);
          const usage = exchange.usage;
          return (
            <List.Item
              key={exchange.id}
              id={exchange.id}
              icon={exchange.error ? Icon.ExclamationMark : Icon.Message}
              title={exchange.question}
              detail={
                <List.Item.Detail
                  markdown={markdown}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Link
                        title="Model"
                        text={exchange.model}
                        target={modelPageUrl(exchange.model)}
                      />
                      {usage?.promptTokens !== undefined && (
                        <List.Item.Detail.Metadata.Label
                          title="Tokens"
                          text={`${usage.promptTokens} in, ${usage.completionTokens ?? 0} out`}
                        />
                      )}
                      {info?.promptPrice !== undefined && (
                        <List.Item.Detail.Metadata.Label
                          title="Price per 1M Tokens"
                          text={`${perMillion(info.promptPrice)} in, ${perMillion(info.completionPrice) ?? "-"} out`}
                        />
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  {sendAction}
                  {answer && <Action.CopyToClipboard title="Copy Answer" content={answer} />}
                  {answer && (
                    <Action.Paste
                      title="Paste Answer"
                      content={answer}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                    />
                  )}
                  <Action.CopyToClipboard
                    title="Copy Question"
                    content={exchange.question}
                    shortcut={Keyboard.Shortcut.Common.CopyName}
                  />
                  <Action
                    title="Copy Conversation"
                    icon={Icon.CopyClipboard}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                    onAction={async () => {
                      await Clipboard.copy(conversationMarkdown(exchanges));
                      await showToast({ style: Toast.Style.Success, title: "Copied conversation" });
                    }}
                  />
                  {!busy && (
                    <Action
                      title="Ask Again"
                      icon={Icon.RotateClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={() => ask(exchange.question)}
                    />
                  )}
                  {commonActions}
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
