import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  type LaunchProps,
  useNavigation,
} from '@raycast/api';
import { usePromise } from '@raycast/utils';

import { askCopilot } from './lib/api';
import { AuthError } from './lib/oauth';
import { LoginPromptDetail } from './lib/login-prompt';
import { getWorkspaceUrl } from './lib/preferences';

function AnswerView({
  question,
  threadId,
}: {
  question: string;
  threadId?: string;
}) {
  const { push } = useNavigation();
  const { data, isLoading, error } = usePromise(
    (q: string, t?: string) => askCopilot(q, t),
    [question, threadId],
  );

  if (error instanceof AuthError) {
    return <LoginPromptDetail />;
  }

  const body = isLoading
    ? '_Thinking…_'
    : error
      ? `⚠️ ${error.message}`
      : (data?.answer ?? '');

  const markdown = `### ${question}\n\n${body}`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {data && (
            <Action
              title="Ask Follow-up"
              icon={Icon.Reply}
              onAction={() => push(<FollowUpForm threadId={data.threadId} />)}
            />
          )}
          {data && (
            <Action.CopyToClipboard title="Copy Answer" content={data.answer} />
          )}
          <Action.OpenInBrowser
            title="Open Deserveos"
            url={getWorkspaceUrl()}
          />
        </ActionPanel>
      }
    />
  );
}

function FollowUpForm({ threadId }: { threadId: string }) {
  const { push } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send"
            icon={Icon.Reply}
            onSubmit={(values: { question: string }) => {
              const next = values.question?.trim();
              if (next) {
                push(<AnswerView question={next} threadId={threadId} />);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="question"
        title="Follow-up"
        placeholder="Ask a follow-up question…"
      />
    </Form>
  );
}

export default function Command(
  props: LaunchProps<{ arguments: { question: string } }>,
) {
  const question = props.arguments.question?.trim();

  if (!question) {
    return <Detail markdown="Type a question to ask your CRM." />;
  }

  return <AnswerView question={question} />;
}
