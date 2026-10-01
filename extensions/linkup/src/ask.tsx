import { Action, ActionPanel, Detail, Form, Icon, Keyboard, LaunchProps, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useForm, usePromise } from "@raycast/utils";
import type { Source } from "linkup-sdk";
import { formatLinkupError, getHostname, sourcedAnswer } from "./linkup";

type AskDetailProps = {
  query: string;
};

function buildAnswerMarkdown(query: string, answer: string, sources: Source[]) {
  const sourcesSection =
    sources.length > 0
      ? sources
          .map((source, index) => `${index + 1}. [${source.name || getHostname(source.url)}](${source.url})`)
          .join("\n")
      : "_No sources returned._";

  return `# ${query}

${answer}

---

## Sources

${sourcesSection}`;
}

function AskDetail({ query }: AskDetailProps) {
  const { data, error, isLoading, revalidate } = usePromise(sourcedAnswer, [query], {
    onError: (error) => {
      showFailureToast(error, { title: "Failed to get answer", message: formatLinkupError(error) });
    },
  });

  const sources = data?.sources ?? [];
  const sourceLinksMarkdown = sources.map((source) => `[${source.name || getHostname(source.url)}](${source.url})`);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Ask Linkup"
      markdown={
        error
          ? `# Failed to Get Answer\n\n${formatLinkupError(error)}`
          : buildAnswerMarkdown(query, data?.answer ?? "Searching the web with Linkup...", sources)
      }
      actions={
        <ActionPanel>
          {data?.answer ? <Action.CopyToClipboard title="Copy Answer" content={data.answer} /> : null}
          {sourceLinksMarkdown.length > 0 ? (
            <Action.CopyToClipboard
              title="Copy Sources"
              content={sourceLinksMarkdown.join("\n")}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          ) : null}
          <Action title="Retry" icon={Icon.RotateClockwise} onAction={revalidate} />
        </ActionPanel>
      }
    />
  );
}

export default function Command(props: LaunchProps<{ arguments: Arguments.Ask }>) {
  const initialQuery = props.arguments.query?.trim();

  if (initialQuery) {
    return <AskDetail query={initialQuery} />;
  }

  return <AskForm />;
}

function AskForm() {
  const { push } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ query: string }>({
    validation: {
      query: FormValidation.Required,
    },
    onSubmit(values) {
      push(<AskDetail query={values.query.trim()} />);
    },
  });

  return (
    <Form
      navigationTitle="Ask Linkup"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Ask Linkup" icon={Icon.Message} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Question"
        placeholder="Ask a question to answer from the web"
        info="Linkup searches the web and answers with the sources it used."
        {...itemProps.query}
      />
    </Form>
  );
}
