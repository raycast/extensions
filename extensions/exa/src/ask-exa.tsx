import { Action, ActionPanel, Detail, Form, Icon, LaunchProps, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { formatExaError, getGroundedAnswer, getHostname, streamGroundedAnswer } from "./exa";

type AskExaDetailProps = {
  query: string;
};

type Citation = {
  title: string;
  url: string;
  publishedDate?: string;
};

function formatPublishedDate(publishedDate?: string) {
  if (!publishedDate) {
    return undefined;
  }

  const date = new Date(publishedDate);
  if (Number.isNaN(date.getTime())) {
    return publishedDate;
  }

  return date.toLocaleDateString();
}

function buildAnswerMarkdown(
  query: string,
  answer: string,
  citations: { title: string; url: string; publishedDate?: string }[],
) {
  const citationsSection =
    citations.length > 0
      ? citations
          .map((citation, index) => {
            const publishedDate = formatPublishedDate(citation.publishedDate);
            const suffix = publishedDate ? ` (${publishedDate})` : "";
            return `${index + 1}. [${citation.title}](${citation.url})${suffix}`;
          })
          .join("\n")
      : "_No citations returned._";

  return `# ${query}

${answer}

---

## Sources

${citationsSection}`;
}

function AskExaDetail({ query }: AskExaDetailProps) {
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<Citation[]>([]);
  const [error, setError] = useState<unknown>();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function runStream() {
      setAnswer("");
      setCitations([]);
      setError(undefined);
      setIsLoading(true);

      try {
        for await (const chunk of streamGroundedAnswer(query)) {
          if (cancelled) {
            return;
          }

          if (chunk.content) {
            setAnswer((current) => current + chunk.content);
          }

          if (chunk.citations && chunk.citations.length > 0) {
            setCitations((current) => {
              const seen = new Set(current.map((citation) => citation.url));
              const next = [...current];

              for (const citation of chunk.citations ?? []) {
                if (!seen.has(citation.url)) {
                  seen.add(citation.url);
                  next.push({
                    title: citation.title || getHostname(citation.url),
                    url: citation.url,
                    publishedDate: citation.publishedDate,
                  });
                }
              }

              return next;
            });
          }
        }
      } catch (streamError) {
        if (cancelled) {
          return;
        }

        try {
          const fallback = await getGroundedAnswer(query);
          if (cancelled) {
            return;
          }

          const fallbackAnswer =
            typeof fallback.answer === "string" ? fallback.answer : JSON.stringify(fallback.answer, null, 2);
          setAnswer(fallbackAnswer);
          setCitations(
            fallback.citations.map((citation) => ({
              title: citation.title || getHostname(citation.url),
              url: citation.url,
              publishedDate: citation.publishedDate,
            })),
          );
        } catch (fallbackError) {
          setError(fallbackError ?? streamError);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    runStream();

    return () => {
      cancelled = true;
    };
  }, [query, refreshKey]);

  const sourceLinksMarkdown =
    citations.length > 0 ? citations.map((citation) => `[${citation.title}](${citation.url})`).join("\n") : "";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Answer with Exa"
      markdown={
        error
          ? `# Failed to Answer with Exa\n\n${formatExaError(error)}`
          : buildAnswerMarkdown(query, answer || "Loading answer from Exa...", citations)
      }
      actions={
        <ActionPanel>
          {answer ? <Action.CopyToClipboard title="Copy Answer" content={answer} /> : null}
          {sourceLinksMarkdown ? (
            <Action.CopyToClipboard
              title="Copy Sources"
              content={sourceLinksMarkdown}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          ) : null}
          <Action title="Retry" icon={Icon.RotateClockwise} onAction={() => setRefreshKey((current) => current + 1)} />
        </ActionPanel>
      }
    />
  );
}

export default function Command(props: LaunchProps<{ arguments: Arguments.AskExa }>) {
  const initialQuery = props.arguments.query?.trim();

  if (initialQuery) {
    return <AskExaDetail query={initialQuery} />;
  }

  return <AskExaForm />;
}

function AskExaForm() {
  const { push } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ query: string }>({
    validation: {
      query: FormValidation.Required,
    },
    onSubmit(values) {
      push(<AskExaDetail query={values.query} />);
    },
  });

  return (
    <Form
      navigationTitle="Answer with Exa"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Answer with Exa" icon={Icon.Message} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Question"
        placeholder="Ask a question that Exa should answer with citations"
        info="Exa will answer directly and attach citations you can inspect."
        {...itemProps.query}
      />
    </Form>
  );
}
