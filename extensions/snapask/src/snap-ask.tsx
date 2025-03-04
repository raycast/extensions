import { Action, ActionPanel, Detail, Form, getPreferenceValues, Icon, LaunchProps, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { ask } from "./services/ai";
import { AIMessageChunk } from "@langchain/core/messages";

type Values = {
  query: string;
  focus: string;
};

const { model: modelUsed } = getPreferenceValues<Preferences>();

function ResultView({ query }: { query: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<AIMessageChunk | null>(null);

  useEffect(() => {
    setIsLoading(true);
    ask(query).then((result) => {
      setResult(result);
      setIsLoading(false);
    });
  }, [query]);

  const promptTokens = String(result?.response_metadata?.tokenUsage?.promptTokens ?? "-");
  const completionTokens = String(result?.response_metadata?.tokenUsage?.completionTokens ?? "-");
  const totalTokens = String(result?.response_metadata?.tokenUsage?.totalTokens ?? "-");

  return (
    <Detail
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={result?.content.toString() ?? ""} />
        </ActionPanel>
      }
      navigationTitle={query}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label icon={Icon.QuestionMark} title="Question" text={query} />
          <Detail.Metadata.Label icon={Icon.ComputerChip} title="Model Used" text={modelUsed} />
          <Detail.Metadata.Label icon={Icon.Paragraph} title="Completion Tokens" text={completionTokens} />
          <Detail.Metadata.Label icon={Icon.Paragraph} title="Prompt Tokens" text={promptTokens} />
          <Detail.Metadata.Label title="Total Tokens" text={totalTokens} />
        </Detail.Metadata>
      }
      isLoading={isLoading}
      markdown={result?.content.toString() ?? ""}
    />
  );
}

export default function Command(props: LaunchProps<{ draftValues: Values; arguments: Arguments.SnapAsk }>) {
  const { push } = useNavigation();

  const { handleSubmit, itemProps } = useForm<Values>({
    onSubmit({ query }) {
      push(<ResultView query={query} />);
      return true;
    },
    initialValues: {
      query: props.draftValues?.query ?? "",
    },
    validation: {
      query: (value) => (value && value.length > 0 ? null : "Query cannot be empty"),
    },
  });

  if (props.arguments.query) {
    return <ResultView query={props.arguments.query} />;
  }

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Get instant AI answers for your questions." />
      <Form.TextArea title="Ask Anything" {...itemProps.query} />
      <Form.Separator />
    </Form>
  );
}
