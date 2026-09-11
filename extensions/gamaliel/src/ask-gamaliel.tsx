import { Action, ActionPanel, Detail, Icon, Keyboard, List, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
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

export default function Command() {
  const preferences = useMemo(() => getPreferenceValues<Preferences.AskGamaliel>(), []);
  const [bibleId, setBibleId] = useState(() => resolveBibleId(preferences.bibleId));
  const requestPreferences = useMemo(() => ({ ...preferences, bibleId }), [bibleId, preferences]);
  const [searchText, setSearchText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const selectedTranslation = findTranslation(bibleId) ?? BIBLE_TRANSLATIONS[0];
  const query = searchText.trim();
  const currentQuestion = useMemo(() => {
    return [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
  }, [messages]);

  const markdown = useMemo(() => {
    return formatAnswerMarkdown(currentQuestion, answer, isLoading, error);
  }, [answer, currentQuestion, error, isLoading]);

  const citations = useMemo(() => extractScriptureLinks(markdown), [markdown]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== "user") {
      return;
    }

    let cancelled = false;

    async function run() {
      setIsLoading(true);
      setError(null);
      setAnswer("");

      try {
        const content = await streamAnswer(messages, requestPreferences, (next) => {
          if (!cancelled) {
            setAnswer(next);
          }
        });
        if (!cancelled) {
          setAnswer(content);
          setMessages((previous) => {
            if (previous[previous.length - 1] !== last) {
              return previous;
            }
            return [...previous, { role: "assistant", content }];
          });
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
  }, [generation, messages, requestPreferences]);

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

    setMessages((previous) => {
      const last = previous[previous.length - 1];
      if (last?.role === "user") {
        if (last.content === question) {
          return previous;
        }
        return [...previous.slice(0, -1), { role: "user", content: question }];
      }
      return [...previous, { role: "user", content: question }];
    });
    setGeneration((value) => value + 1);
    setShowAnswer(true);
  }

  function askAnotherQuestion() {
    setSearchText("");
    setShowAnswer(false);
  }

  function startNewConversation() {
    setMessages([]);
    setAnswer("");
    setError(null);
    setIsLoading(false);
    setSearchText("");
    setGeneration(0);
    setShowAnswer(false);
  }

  const actions = (
    <ActionPanel>
      {citations[0] ? (
        <Action.OpenInBrowser title={`Open ${citations[0].label}`} icon={Icon.Book} url={citations[0].url} />
      ) : null}
      <Action.OpenInBrowser title="Open Gamaliel" icon={{ source: "gamaliel-logo.png" }} url={GAMALIEL_ORIGIN} />
      {answer && !error ? (
        <Action.CopyToClipboard title="Copy Answer" icon={Icon.Clipboard} content={absolutizeScriptureLinks(answer)} />
      ) : null}
      {currentQuestion ? (
        <Action.CopyToClipboard title="Copy Question" icon={Icon.Text} content={currentQuestion} />
      ) : null}
      <Action title="Ask Another Question" icon={Icon.MagnifyingGlass} onAction={askAnotherQuestion} />
      <Action
        title="New Conversation"
        icon={Icon.Plus}
        shortcut={Keyboard.Shortcut.Common.New}
        onAction={startNewConversation}
      />
    </ActionPanel>
  );

  if (showAnswer) {
    return <Detail isLoading={isLoading} markdown={markdown} actions={actions} />;
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
        icon={{ source: "gamaliel-logo.png" }}
        title="Bible Q&A"
        description="Ask any question, get a biblical answer"
        actions={
          <ActionPanel>
            <Action title="Ask" icon={Icon.MagnifyingGlass} onAction={() => submit(query)} />
          </ActionPanel>
        }
      />
    </List>
  );
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
