import { Action, ActionPanel, Detail, Form, Icon, LaunchProps, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getClient } from "./lib/preferences";
import { DocumentDetailView } from "./components/document-detail";
import { askToMarkdown, documentUrl, sourcesFor } from "./lib/format";
import type { AskResponse } from "./lib/types";

// Ask Vault: a deliberate submit (never fired on keystroke) since /ask is paid,
// rate-limited, and a few seconds per call. Launch with the `question` argument
// to skip the form and answer straight away.
export default function Command(props: LaunchProps<{ arguments: { question?: string } }>) {
  const initial = props.arguments?.question?.trim();
  if (initial) {
    return <AnswerView question={initial} />;
  }
  return <AskForm />;
}

function AskForm() {
  const { push } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Ask"
            icon={Icon.QuestionMark}
            onSubmit={(values: { question: string }) => {
              const q = values.question?.trim();
              if (q) push(<AnswerView question={q} />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="question"
        title="Question"
        placeholder="When does my passport expire? How much VAT did I pay in 2024?"
        autoFocus
      />
    </Form>
  );
}

function AnswerView({ question }: { question: string }) {
  const { isLoading, data } = usePromise(
    (q: string) => getClient().request<AskResponse>("POST", "/ask", { query: { q } }),
    [question],
  );

  // Lead with the question (as a quote) so the view stands on its own, then the
  // answer. Sources live in the metadata panel as clickable links — the native
  // Raycast home for references, and it keeps the body free of a giant heading.
  const prompt = `> ${question.replace(/\s*\n+\s*/g, " ")}`;
  const body = data ? askToMarkdown(data) : "_Asking your vault…_";
  const markdown = `${prompt}\n\n${body}`;
  const sources = data ? sourcesFor(data) : [];

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={question}
      markdown={markdown}
      metadata={
        sources.length ? (
          <Detail.Metadata>
            {sources.map((s, i) => (
              <Detail.Metadata.Link
                key={s.id}
                title={i === 0 ? "Sources" : ""}
                target={documentUrl(s.id)}
                text={s.title}
              />
            ))}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          {data?.answer ? <Action.CopyToClipboard title="Copy Answer" content={data.answer} /> : null}
          {sources.length ? (
            <ActionPanel.Section title="Sources">
              {sources.map((s) => (
                <Action.Push
                  key={s.id}
                  title={`Open “${s.title}”`}
                  icon={Icon.Document}
                  target={<DocumentDetailView id={s.id} knownTitle={s.title} />}
                />
              ))}
            </ActionPanel.Section>
          ) : null}
        </ActionPanel>
      }
    />
  );
}
