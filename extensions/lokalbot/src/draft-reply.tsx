import { Clipboard, Detail, getSelectedText } from "@raycast/api";
import type { LaunchProps } from "@raycast/api";
import { useEffect, useState } from "react";
import { AnswerView } from "./answer-view";
import { useLokalBotAnswer } from "./use-lokalbot-answer";

interface Message {
  text: string;
  source: "Selection" | "Clipboard";
}

async function readMessage(): Promise<Message | null> {
  const selected = await getSelectedText().catch(() => "");
  if (selected.trim()) return { text: selected, source: "Selection" };
  const copied = await Clipboard.readText();
  return copied?.trim() ? { text: copied, source: "Clipboard" } : null;
}

function preview(text: string): string {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length > 120 ? `${line.slice(0, 119)}…` : line;
}

export default function Command(
  props: LaunchProps<{ arguments: { instruction?: string } }>,
) {
  const instruction = props.arguments.instruction?.trim() ?? "";
  const [message, setMessage] = useState<Message | null | undefined>();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    readMessage().then(setMessage, () => setMessage(null));
  }, []);

  const state = useLokalBotAnswer(
    message
      ? {
          args: [
            "reply",
            ...(instruction ? ["--instruction", instruction] : []),
          ],
          input: message.text,
        }
      : null,
    revision,
  );

  if (message === undefined) {
    return <Detail isLoading markdown="Reading the selected text…" />;
  }
  if (message === null) {
    return (
      <Detail
        markdown={
          "## Select a message first\n\nSelect the message you want to answer in any app, or copy it, then run Draft Reply again."
        }
      />
    );
  }

  return (
    <AnswerView
      state={state}
      loadingMarkdown={`## Drafting a reply…\n\n> ${preview(message.text)}\n\nLokalBot is reading the meetings this message mentions. The first draft after LokalBot starts can take up to a minute while its local model loads.`}
      labels={[
        { title: "Replying to", text: preview(message.text) },
        { title: "From", text: message.source },
        ...(instruction ? [{ title: "Instruction", text: instruction }] : []),
      ]}
      resultActions={[
        { kind: "paste", title: "Paste Draft" },
        { kind: "copy", title: "Copy Draft" },
      ]}
      retry={() => setRevision((value) => value + 1)}
    />
  );
}
