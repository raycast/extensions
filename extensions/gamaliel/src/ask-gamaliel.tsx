import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Keyboard,
  List,
  Toast,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { canAskFollowUp, streamAnswer } from "./lib/api";
import { GAMALIEL_ORIGIN, absolutizeScriptureLinks, extractScriptureLinks } from "./lib/links";
import {
  BIBLE_TRANSLATIONS,
  findTranslation,
  resolveBibleId,
  translationLabel,
  translationsByLanguage,
} from "./lib/translations";
import type { ChatMessage } from "./lib/types";

type RequestPreferences = {
  theology: string;
  profile: string;
  bibleId: string;
  maxWords?: string;
};

export default function Command() {
  const preferences = useMemo(() => getPreferenceValues<Preferences.AskGamaliel>(), []);
  const [bibleId, setBibleId] = useState(() => resolveBibleId(preferences.bibleId));
  const [searchText, setSearchText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { push } = useNavigation();

  const selectedTranslation = findTranslation(bibleId) ?? BIBLE_TRANSLATIONS[0];
  const query = searchText.trim();

  function snapshotPreferences(): RequestPreferences {
    return {
      theology: preferences.theology,
      profile: preferences.profile,
      bibleId,
      maxWords: preferences.maxWords,
    };
  }

  async function submit(raw: string) {
    const question = raw.trim();
    if (!question) {
      await showToast({ style: Toast.Style.Failure, title: "Enter a question" });
      return;
    }
    if (!canAskFollowUp(messages)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Conversation limit reached",
        message: "Start a new conversation to keep asking.",
      });
      return;
    }

    const nextMessages = nextConversation(messages, question);
    const userMessage = nextMessages[nextMessages.length - 1];
    const requestPreferences = snapshotPreferences();
    setMessages(nextMessages);
    push(
      <Answer
        messages={nextMessages}
        preferences={requestPreferences}
        onAnswered={(content) => {
          setMessages((current) => {
            const last = current[current.length - 1];
            if (last !== userMessage) {
              return current;
            }
            return [...current, { role: "assistant", content }];
          });
        }}
        onNewConversation={() => {
          setMessages([]);
          setSearchText("");
        }}
      />,
    );
  }

  return (
    <List
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Ask any question…"
      searchBarAccessory={
        <List.Dropdown
          tooltip={translationLabel(selectedTranslation)}
          value={bibleId}
          onChange={(next) => setBibleId(next.startsWith("menu:") ? next.slice(5) : next)}
        >
          {/* Closed control shows this item's title; menu rows keep the full name. */}
          <List.Dropdown.Item title={selectedTranslation.abbreviation} value={bibleId} />
          {translationsByLanguage().map((group) => (
            <List.Dropdown.Section key={group.language} title={group.language}>
              {group.translations.map((translation) => (
                <List.Dropdown.Item
                  key={translation.id}
                  title={translationLabel(translation)}
                  value={`menu:${translation.id}`}
                  keywords={[translation.abbreviation, translation.name, translation.language]}
                />
              ))}
            </List.Dropdown.Section>
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={{ source: "gamaliel-mark.png" }}
        title="Bible Q&A"
        description="Ask any question, get a biblical answer"
        actions={
          <ActionPanel>
            <Action title="Ask" icon={Icon.MagnifyingGlass} onAction={() => submit(query)} />
            {messages.length > 0 ? (
              <Action
                title="New Conversation"
                icon={Icon.Plus}
                shortcut={Keyboard.Shortcut.Common.New}
                onAction={() => {
                  setMessages([]);
                  setSearchText("");
                }}
              />
            ) : null}
          </ActionPanel>
        }
      />
    </List>
  );
}

function Answer({
  messages,
  preferences,
  onAnswered,
  onNewConversation,
}: {
  messages: ChatMessage[];
  preferences: RequestPreferences;
  onAnswered: (content: string) => void;
  onNewConversation: () => void;
}) {
  const { pop } = useNavigation();
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const onAnsweredRef = useRef(onAnswered);
  onAnsweredRef.current = onAnswered;

  const currentQuestion = useMemo(() => {
    return [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
  }, [messages]);

  const markdown = useMemo(() => {
    return formatAnswerMarkdown(currentQuestion, answer, isLoading, error);
  }, [answer, currentQuestion, error, isLoading]);

  const citations = useMemo(() => extractScriptureLinks(markdown), [markdown]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setIsLoading(true);
      setError(null);
      setAnswer("");

      try {
        const content = await streamAnswer(messages, preferences, (next) => {
          if (!cancelled) {
            setAnswer(next);
          }
        });
        if (!cancelled) {
          setAnswer(content);
          onAnsweredRef.current(content);
        }
      } catch (caught) {
        if (!cancelled) {
          setAnswer("");
          const message = caught instanceof Error ? caught.message : "Unknown error";
          setError(message);
          await showToast({ style: Toast.Style.Failure, title: "Gamaliel request failed", message });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [messages, preferences]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={currentQuestion || "Answer"}
      actions={
        <ActionPanel>
          {citations[0] ? (
            <Action.OpenInBrowser title={`Open ${citations[0].label}`} icon={Icon.Book} url={citations[0].url} />
          ) : null}
          <Action.OpenInBrowser title="Open Gamaliel" icon={{ source: "gamaliel-mark.png" }} url={GAMALIEL_ORIGIN} />
          {answer && !error ? (
            <Action.CopyToClipboard
              title="Copy Answer"
              icon={Icon.Clipboard}
              content={absolutizeScriptureLinks(answer)}
            />
          ) : null}
          {currentQuestion ? (
            <Action.CopyToClipboard title="Copy Question" icon={Icon.Text} content={currentQuestion} />
          ) : null}
          <Action title="Ask Another Question" icon={Icon.MagnifyingGlass} onAction={() => pop()} />
          <Action
            title="New Conversation"
            icon={Icon.Plus}
            shortcut={Keyboard.Shortcut.Common.New}
            onAction={() => {
              onNewConversation();
              pop();
            }}
          />
        </ActionPanel>
      }
    />
  );
}

function nextConversation(messages: ChatMessage[], question: string): ChatMessage[] {
  const last = messages[messages.length - 1];
  if (last?.role === "user") {
    if (last.content === question) {
      return messages;
    }
    return [...messages.slice(0, -1), { role: "user", content: question }];
  }
  return [...messages, { role: "user", content: question }];
}

function formatAnswerMarkdown(question: string, answer: string, isLoading: boolean, error: string | null): string {
  const questionBlock = question
    .split("\n")
    .map((line) => `> *${escapeMarkdown(line)}*`)
    .join("\n");

  if (error) {
    return `${questionBlock}\n\n**Could not get an answer**\n\n${error}`;
  }
  if (!answer) {
    return isLoading ? `${questionBlock}\n\n*Asking Gamaliel…*` : questionBlock;
  }
  return `${questionBlock}\n\n${absolutizeScriptureLinks(answer)}`;
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_[\]()#>+-]/g, "\\$&");
}
