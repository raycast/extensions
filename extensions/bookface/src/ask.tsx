import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  useNavigation,
} from "@raycast/api";
import {
  DeeplinkType,
  FormValidation,
  createDeeplink,
  useCachedPromise,
  useForm,
} from "@raycast/utils";
import { useMemo } from "react";
import { EXAMPLE_QUESTIONS } from "./lib/example-questions";
import { runYc, truncate } from "./lib/yc";
import {
  ErrorDetail,
  MissingCliDetail,
  NotAuthedDetail,
} from "./lib/empty-states";
import { UpdateYcCli } from "./views/updater";
import { useRecentSearches } from "./hooks/use-recent-searches";
import type { AgentResponse, AgentToolCall } from "./lib/types";

const RECENT_QUESTIONS_KEY = "ask-recents";
const RECENT_QUESTION_TITLE_MAX = 80;

const LOADING_BODY = `_Compiling your response…_

The YC agent searches Bookface across people, companies, posts, and deals to ground its answer.`;

// Render the steps the agent took (e.g. "Searching the forum for …") as a small
// trailing section, so the answer is transparent about what it grounded on. The
// CLI provides a ready `display_message`; fall back to entity/query if absent.
function toolCallsMarkdown(calls: AgentToolCall[] | undefined): string {
  if (!calls || calls.length === 0) return "";
  const lines = calls.map((c) => {
    const a = c.arguments;
    const text =
      a?.display_message ??
      (a?.entity && a?.query
        ? `Searched ${a.entity} for "${a.query}"`
        : c.name);
    return `- ${text}`;
  });
  return ["\n---\n", "**What the agent did**", "", ...lines].join("\n");
}

function raycastAIChatUrl(question: string, response: string): string {
  const text = `Context from the YC Agent (which searches Bookface, YC's internal network):

Original question:
${question}

YC Agent's response:
${response}`;
  // createDeeplink builds the inter-extension URL from typed fields rather than a
  // hand-written raycast:// string, and (unlike launchCommand) carries fallbackText
  // to pre-fill the AI chat input.
  return createDeeplink({
    type: DeeplinkType.Extension,
    ownerOrAuthorName: "raycast",
    extensionName: "raycast-ai",
    command: "ai-chat",
    fallbackText: text,
  });
}

type FormValues = { question: string };

export default function Command() {
  return <AskForm />;
}

function AskForm() {
  const { push } = useNavigation();
  const { recentSearches, addRecentSearch, clearRecentSearches } =
    useRecentSearches(RECENT_QUESTIONS_KEY, 15);

  const placeholder = useMemo(
    () =>
      EXAMPLE_QUESTIONS[Math.floor(Math.random() * EXAMPLE_QUESTIONS.length)],
    [],
  );

  const { handleSubmit, itemProps, setValue } = useForm<FormValues>({
    initialValues: { question: "" },
    onSubmit: async (values) => {
      const q = values.question.trim();
      await addRecentSearch(q);
      push(<AnswerView question={q} />);
    },
    validation: {
      question: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Ask YC Agent"
            onSubmit={handleSubmit}
            icon={Icon.Wand}
          />
          {recentSearches.length > 0 ? (
            <ActionPanel.Submenu
              title="Recent Questions"
              icon={Icon.Clock}
              shortcut={{ modifiers: ["cmd"], key: "h" }}
            >
              {recentSearches.map((r) => (
                <Action
                  key={r.query}
                  title={truncate(r.query, RECENT_QUESTION_TITLE_MAX)}
                  onAction={() => setValue("question", r.query)}
                />
              ))}
            </ActionPanel.Submenu>
          ) : null}
          {recentSearches.length > 0 ? (
            <Action
              title="Clear Recent Questions"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
              onAction={clearRecentSearches}
            />
          ) : null}
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Question"
        placeholder={placeholder}
        autoFocus
        {...itemProps.question}
      />
      <Form.Description text="Responses include full answers with links to Bookface profiles, companies, and posts." />
    </Form>
  );
}

function AnswerView({ question }: { question: string }) {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    (q: string) => runYc<AgentResponse>(["agent", q, "--json"]),
    [question],
    { keepPreviousData: true },
  );

  if (error) {
    return (
      <ErrorDetail
        message={error instanceof Error ? error.message : String(error)}
        onRetry={revalidate}
      />
    );
  }

  if (data && !data.ok) {
    if (data.kind === "missing-cli")
      return <MissingCliDetail onRetry={revalidate} />;
    if (data.kind === "not-authed")
      return <NotAuthedDetail onRetry={revalidate} />;
    if (data.kind === "update-required")
      return <UpdateYcCli gate={data.gate} onRetry={revalidate} />;
    return <ErrorDetail message={data.message} onRetry={revalidate} />;
  }

  const response = data?.ok ? data.data.response : null;
  const toolCalls = data?.ok ? data.data.tool_calls : undefined;
  const markdown = response
    ? `**You:** ${question}\n\n---\n\n${response}${toolCallsMarkdown(toolCalls)}`
    : `**You:** ${question}\n\n---\n\n${LOADING_BODY}`;
  const continueYcUrl = `https://messages.ycombinator.com/messages/new?type=agent&prompt=${encodeURIComponent(question)}`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {response ? (
            <Action.OpenInBrowser
              title="Continue with YC Agent"
              url={continueYcUrl}
              icon={Icon.Globe}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          ) : null}
          {response ? (
            <Action.Open
              title="Continue in Raycast AI"
              target={raycastAIChatUrl(question, response)}
              icon={Icon.Stars}
              shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
            />
          ) : null}
          {response ? (
            <Action.CopyToClipboard title="Copy Response" content={response} />
          ) : null}
          <Action.CopyToClipboard
            title="Copy Question"
            content={question}
            shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
          />
        </ActionPanel>
      }
    />
  );
}
