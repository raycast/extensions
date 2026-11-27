import {
  Action,
  ActionPanel,
  AI,
  Detail,
  environment,
  Form,
  Icon,
  type LaunchProps,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { prepare, type Source } from "./lib/ask";
import { shortUrl } from "./lib/format";

export default function AskFloppy(props: LaunchProps<{ arguments: { question?: string } }>) {
  const question = props.arguments.question?.trim() ?? "";
  if (!environment.canAccess(AI)) return <NoAI />;
  if (question) return <Answer question={question} />;
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
            onSubmit={({ question }: { question: string }) => {
              if (question.trim()) push(<Answer question={question.trim()} />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="question" title="Question" placeholder="What did the Q3 review say about churn?" autoFocus />
      <Form.Description text="Answered from the text files on your Floppy Disk by Raycast AI." />
    </Form>
  );
}

function Answer({ question }: { question: string }) {
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const { isLoading, error } = usePromise(
    async (q: string) => {
      setAnswer("");
      const prepared = await prepare(q);
      setSources(prepared.sources);
      const stream = AI.ask(prepared.prompt, { creativity: "low" });
      stream.on("data", (chunk) => setAnswer((a) => a + chunk));
      await stream;
    },
    [question],
  );

  const list = sources.map((s) => `${s.n}. [${s.path}](${s.url})`).join("\n");
  const body = error ? `**${error.message}**` : answer || (isLoading ? "_Reading your files…_" : "");
  const markdown = `## ${question}\n\n${body}${list ? `\n\n---\n\n**Sources**\n\n${list}` : ""}`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Answer" content={answer} />
          {sources.map((s) => (
            <Action.OpenInBrowser key={s.n} title={`Open ${s.n}: ${s.name}`} url={s.url} />
          ))}
          {sources[0] ? (
            <Action.CopyToClipboard
              title={`Copy ${shortUrl(sources[0].url)}`}
              content={sources[0].url}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

function NoAI() {
  return (
    <Detail
      markdown={`## Ask Floppy needs Raycast AI

Ask Floppy reads the text files on your Floppy Disk and answers with Raycast AI, which comes with Raycast Pro. Floppy itself runs no AI for it.

Everything else in this extension works without it.`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="About Raycast Pro" url="https://www.raycast.com/pro" />
        </ActionPanel>
      }
    />
  );
}
