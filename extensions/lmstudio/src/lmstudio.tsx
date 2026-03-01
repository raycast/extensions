import { Detail, ActionPanel, Action, Form, useNavigation } from "@raycast/api";
import { useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

async function askLMStudio(messages: Message[], model: string): Promise<string> {
  const response = await fetch("http://localhost:1234/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`LM Studio error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { choices: Array<{ message: { content: string } }> };
  const content: string = data.choices[0].message.content;
  return content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

function buildMarkdown(messages: Message[]): string {
  return messages
    .map((m) => (m.role === "user" ? `**You:** ${m.content}` : `**Assistant:** ${m.content}`))
    .join("\n\n---\n\n");
}

function ReplyForm({ onSend }: { onSend: (text: string) => void }) {
  const { pop } = useNavigation();

  function handleSubmit(values: { reply: string }) {
    if (!values.reply.trim()) return;
    onSend(values.reply.trim());
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="reply" title="Your message" placeholder="Write your reply..." />
    </Form>
  );
}

export default function Command(props: { arguments: Arguments.Lmstudio & { prompt: string; model: string } }) {
  const { push } = useNavigation();
  const { prompt, model } = props.arguments;
  const [messages, setMessages] = useState<Message[]>([{ role: "user", content: prompt }]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const lastUserMessage = messages.findLast(m => m.role === 'user')

  useEffect(() => {
    if (hasFetched.current === true) return
    hasFetched.current = true
    setIsLoading(true);
    askLMStudio(messages, model)
      .then((reply) => setMessages((prev) => [...prev, { role: "assistant", content: reply }]))
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));

  }, [lastUserMessage]);

  function handleSend(text: string) {
    hasFetched.current = false
    setMessages((prev) => [...prev, { role: "user", content: text }]);
  }

  if (error) {
    return <Detail markdown={`❌ **Error:** ${error}\n\nMake sure LM Studio is running and the local server is started.`} />;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={buildMarkdown(messages)}
      actions={
        !isLoading ? (
          <ActionPanel>
            <Action
              title="Reply"
              shortcut={{ modifiers: [], key: "return" }}
              onAction={() => push(<ReplyForm onSend={handleSend} />)}
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}