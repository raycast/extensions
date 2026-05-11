import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  List,
  useNavigation,
  Toast,
  showToast,
  Color,
  popToRoot,
  open,
} from "@raycast/api";
import { DateTime } from "luxon";
import { useEffect, useRef, useState } from "react";

import { Sourcegraph, instanceName, LinkBuilder } from "../sourcegraph";
import { useTelemetry } from "../hooks/telemetry";
import {
  startDeepSearch,
  fetchDeepSearchConversation,
  DeepSearchConversation,
  DeepSearchQuestion,
  DeepSearchStatus,
} from "../sourcegraph/deep-search";
import ExpandableToast from "./ExpandableToast";
import { copyShortcut, tertiaryActionShortcut } from "./shortcuts";

const link = new LinkBuilder("deep-search");

export default function AskDeepSearchCommand({ src }: { src: Sourcegraph }) {
  const { recorder } = useTelemetry(src);
  useEffect(() => recorder.recordEvent("askDeepSearch", "start"), []);

  const { push } = useNavigation();
  const questionRef = useRef("");

  const openInBrowserUrl = () => {
    const trimmed = questionRef.current.trim();
    if (trimmed) {
      const params = new URLSearchParams();
      params.set("q", trimmed);
      params.set("template", "true");
      return link.new(src, "/deepsearch", params);
    }
    return link.new(src, "/deepsearch");
  };

  return (
    <Form
      navigationTitle={`Deep Search on ${instanceName(src)}`}
      searchBarAccessory={<Form.LinkAccessory text="Documentation" target="https://sourcegraph.com/docs/deep-search" />}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.MagnifyingGlass}
            title="Ask Deep Search"
            onSubmit={async (values: { question: string }) => {
              const q = values.question.trim();
              if (!q) {
                await showToast({ title: "Please enter a question", style: Toast.Style.Failure });
                return;
              }
              push(<DeepSearchConversationDetail src={src} question={q} />, () => {
                // Don't return to the form again on pop
                popToRoot();
              });
            }}
          />
          <Action
            icon={Icon.Globe}
            title="Open in Browser"
            shortcut={tertiaryActionShortcut}
            onAction={() => open(openInBrowserUrl())}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="question"
        title="Question"
        placeholder="Explain how authentication works in..."
        autoFocus
        enableMarkdown={true}
        info="Ask, plan, or search your codebases."
        onChange={(v) => (questionRef.current = v)}
      />
    </Form>
  );
}

export type DeepSearchResultDetailProps =
  | { src: Sourcegraph; question: string; conversation?: undefined; conversationId?: undefined; questionId?: undefined }
  | {
      src: Sourcegraph;
      question?: string;
      conversation: DeepSearchConversation;
      conversationId?: undefined;
      questionId?: number;
    }
  | { src: Sourcegraph; question?: string; conversation?: undefined; conversationId: number; questionId?: number };

function useDeepSearchConversation(src: Sourcegraph, props: DeepSearchResultDetailProps) {
  const [conversation, setConversation] = useState<DeepSearchConversation | null>(
    props.conversation ? props.conversation : null,
  );
  const startedRef = useRef<string | null>(null);
  const cancelRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  // Derived values
  const latestQuestion: DeepSearchQuestion | undefined = conversation?.questions[conversation.questions.length - 1];
  const status = latestQuestion?.status || "pending";
  const isStarting = !conversation && !error;
  const isLoading = isStarting || status === "pending" || status === "processing";

  useEffect(() => {
    cancelRef.current = false;

    async function poll(id: number) {
      while (!cancelRef.current) {
        await new Promise((r) => setTimeout(r, 1000));
        if (cancelRef.current) return;

        try {
          const next = await fetchDeepSearchConversation(src, id);
          if (cancelRef.current) return;
          setConversation(next);

          const latest = next.questions[next.questions.length - 1];
          if (latest.status === "completed" || latest.error) {
            return;
          }
        } catch (e) {
          if (cancelRef.current) return;
          console.error("Deep Search polling error:", e);
        }
      }
    }

    async function run() {
      try {
        if (props.conversation) {
          setConversation(props.conversation);
          const latest = props.conversation.questions.at(-1);
          if (!latest || latest.status === "completed" || latest.error) {
            return;
          }
          await poll(props.conversation.id);
          return;
        }

        if (props.conversationId != null) {
          const initial = await fetchDeepSearchConversation(src, props.conversationId);
          if (cancelRef.current) return;
          setConversation(initial);

          const latest = initial.questions.at(-1);
          if (!latest || latest.status === "completed" || latest.error) {
            return;
          }
          await poll(initial.id);
          return;
        }

        if (!props.question) {
          throw new Error("No question or conversation provided to DeepSearchResultDetail");
        }

        if (startedRef.current === props.question) {
          return;
        }
        startedRef.current = props.question;

        const started = await startDeepSearch(src, { question: props.question });
        setConversation(started);

        const latestQuestion = started.questions[started.questions.length - 1];
        if (latestQuestion.status === "completed" || latestQuestion.error) {
          return;
        }

        await poll(started.id);
      } catch (e) {
        console.error("Deep Search error:", e);
        if (cancelRef.current) return;
        setError(e instanceof Error ? e.message : String(e));
      }
    }

    run();

    return () => {
      cancelRef.current = true;
    };
  }, [props.conversationId, props.question]);

  return {
    conversation,
    error,
    latestQuestion,
    status,
    isLoading,
  };
}

function mapStatusToTag(
  status: DeepSearchStatus | "starting",
  hasError: boolean,
): {
  value: string;
  color: Color.ColorLike;
} {
  if (hasError) {
    return { value: "Failed", color: Color.Red };
  }
  switch (status) {
    case "pending":
      return { value: "Queued", color: Color.SecondaryText };
    case "processing":
      return { value: "Processing", color: Color.Blue };
    case "completed":
      return { value: "Completed", color: Color.Green };
    default:
      return { value: "Starting", color: Color.SecondaryText };
  }
}

export function DeepSearchConversationDetail(props: DeepSearchResultDetailProps) {
  const { src } = props;
  const { push } = useNavigation();

  const { conversation, error, status, isLoading } = useDeepSearchConversation(src, props);

  useEffect(() => {
    if (error) {
      ExpandableToast(push, "Deep Search Error", "Deep Search Failed", error).show();
    }
  }, [error, push]);

  const questions = conversation?.questions ?? [];
  const hasMultipleQuestions = questions.length > 1;

  // Determine which question to show if we are in detail mode
  const selectedQuestion =
    props.questionId != null ? questions.find((q) => q.id === props.questionId) || questions[0] : questions[0];

  // If we are still loading the conversation or have an error (and no conversation), show the basic detail view
  if (!conversation || !selectedQuestion) {
    const question = props.question || conversation?.questions[0]?.question || "";
    const hasError = !!conversation?.questions[0]?.error;
    const statusTag = mapStatusToTag(status, hasError);
    const date = conversation?.created_at
      ? DateTime.fromISO(conversation.created_at).toLocaleString(DateTime.DATETIME_MED)
      : null;

    return (
      <Detail
        navigationTitle={question}
        isLoading={isLoading}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Question" text={question} />
            {date && <Detail.Metadata.Label title="Date" text={date} />}
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item text={statusTag.value} color={statusTag.color} />
            </Detail.Metadata.TagList>
          </Detail.Metadata>
        }
      />
    );
  }

  // Mode 1: Specific question requested OR only one question exists -> Show Detail
  if (props.questionId != null || !hasMultipleQuestions) {
    return (
      <DeepSearchQuestionDetailView
        src={src}
        conversation={conversation}
        question={selectedQuestion}
        isLoading={isLoading}
      />
    );
  }

  // Mode 2: Multiple questions and no specific one requested -> Show List
  return (
    <DeepSearchConversationListView
      src={src}
      conversation={conversation}
      isLoading={isLoading}
      onOpenQuestion={(q) => {
        push(<DeepSearchConversationDetail src={src} conversationId={conversation.id} questionId={q.id} />);
      }}
    />
  );
}

function DeepSearchQuestionDetailView({
  src,
  conversation,
  question,
  isLoading,
}: {
  src: Sourcegraph;
  conversation: DeepSearchConversation;
  question: DeepSearchQuestion;
  isLoading: boolean;
}) {
  const { push } = useNavigation();

  useEffect(() => {
    if (question.error && question.error.kind !== "Cancelled") {
      ExpandableToast(
        push,
        "Deep Search Error",
        question.error.title,
        question.error.details ? `${question.error.message}\n\n${question.error.details}` : question.error.message,
      ).show();
    }
  }, [question.error, push]);

  const statusTag = mapStatusToTag(question.status, !!question.error);
  const questionText = question.question;
  const date = question.created_at ? DateTime.fromISO(question.created_at).toLocaleString(DateTime.DATETIME_MED) : null;

  const conversationUrl =
    conversation.share_url || (conversation.id ? link.new(src, `/deepsearch/${conversation.read_token}`) : null);

  const [showMetadata, setShowMetadata] = useState(true);

  let markdown = ``;

  const filteredTurns = question.turns ? question.turns.filter((t) => t.role !== "user") : [];

  const reasoning = filteredTurns
    // The last turn is often the answer, so easy hack is to only show up
    // to the second-last reasoning block
    .slice(0, filteredTurns.length > 1 ? -1 : undefined)
    // Replace "doing the thing:" with "doing the thing..."
    .map((t) => (t.reasoning.endsWith(":") ? `${t.reasoning.slice(0, -1)}...` : t.reasoning))
    .join("\n\n");
  if (reasoning && !question.answer) {
    markdown += `> ${reasoning.replace(/\n/g, "\n> ")}`;
  }

  if (question.answer) {
    markdown += `${question.answer}\n\n`;
  }

  return (
    <Detail
      navigationTitle={conversation.title || "Deep Search Question"}
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        showMetadata ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Question" text={questionText} />
            <Detail.Metadata.Separator />
            {date && <Detail.Metadata.Label title="Date" text={date} />}
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item text={statusTag.value} color={statusTag.color} />
            </Detail.Metadata.TagList>
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          {conversationUrl && (
            <>
              <Action.OpenInBrowser
                icon={Icon.Globe}
                title="Continue in Browser"
                url={conversationUrl}
                shortcut={tertiaryActionShortcut}
              />
              <Action.CopyToClipboard title="Copy Link" content={conversationUrl} />
            </>
          )}
          {question.answer && (
            <Action.CopyToClipboard title="Copy Answer" content={question.answer} shortcut={copyShortcut} />
          )}
          <Action
            title={showMetadata ? "Hide Metadata" : "Show Metadata"}
            icon={showMetadata ? Icon.EyeDisabled : Icon.Eye}
            onAction={() => setShowMetadata((x) => !x)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
          />
        </ActionPanel>
      }
    />
  );
}

function DeepSearchConversationListView({
  src,
  conversation,
  isLoading,
  onOpenQuestion,
}: {
  src: Sourcegraph;
  conversation: DeepSearchConversation;
  isLoading: boolean;
  onOpenQuestion: (q: DeepSearchQuestion) => void;
}) {
  const conversationUrl =
    conversation.share_url || (conversation.id ? link.new(src, `/deepsearch/${conversation.read_token}`) : null);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={conversation.title || "Deep Search Conversation"}
      searchBarPlaceholder="Filter questions"
    >
      <List.Section title="Questions">
        {conversation.questions.map((q) => {
          const hasError = !!q.error;
          const statusTag = mapStatusToTag(q.status, hasError);
          return (
            <List.Item
              key={q.id}
              title={q.question}
              subtitle={
                q.status === "completed" && !hasError && q.answer
                  ? q.answer.slice(0, 200).replace(/\n/g, " ") + (q.answer.length > 200 ? "..." : "")
                  : statusTag.value
              }
              accessories={
                q.status !== "completed" || hasError
                  ? [
                      {
                        tag: { value: statusTag.value, color: statusTag.color },
                      },
                    ]
                  : undefined
              }
              actions={
                <ActionPanel>
                  <Action title="Open Question" icon={Icon.Sidebar} onAction={() => onOpenQuestion(q)} />
                  {conversationUrl && (
                    <Action.OpenInBrowser
                      icon={Icon.Globe}
                      title="Continue in Browser"
                      url={conversationUrl}
                      shortcut={tertiaryActionShortcut}
                    />
                  )}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
