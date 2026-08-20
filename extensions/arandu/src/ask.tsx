import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  useNavigation,
} from "@raycast/api";
import { useForm, usePromise, FormValidation } from "@raycast/utils";
import { api } from "./lib/client";

function Answer({ question }: { question: string }) {
  const { data, error, isLoading } = usePromise(
    async (q: string) => api.ask(q),
    [question],
  );

  const reply = error
    ? `**Error:** ${error.message}`
    : data
      ? (data.text ?? data.question ?? data.followUpQuestion ?? "(no reply)")
      : "Arandu is thinking… agent turns can take up to a minute.";
  const markdown = `> ${question}\n\n---\n\n${reply}`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {data?.text ? (
            <Action.CopyToClipboard title="Copy Reply" content={data.text} />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

interface Values {
  message: string;
}

export default function Ask() {
  const { push } = useNavigation();
  const { handleSubmit, itemProps } = useForm<Values>({
    validation: { message: FormValidation.Required },
    onSubmit: (values) => {
      push(<Answer question={values.message.trim()} />);
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Ask Arandu"
            icon={Icon.SpeechBubble}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Message"
        placeholder="Ask anything — create tasks, check your day, log expenses…"
        {...itemProps.message}
      />
      <Form.Description text="Arandu replies in the language you write. Agent turns can take up to a minute." />
    </Form>
  );
}
