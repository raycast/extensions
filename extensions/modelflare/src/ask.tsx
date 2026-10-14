import { Action, ActionPanel, Detail, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";

import { streamChatCompletion } from "./core/index.js";
import { explain, modelflare, modelIds } from "./modelflare";

function Answer(props: { model: string; prompt: string }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const events = streamChatCompletion(
          modelflare().client,
          { model: props.model, messages: [{ role: "user", content: props.prompt }] },
          controller.signal,
        );
        for await (const event of events) {
          if (event.type === "text") setText((current) => current + event.text);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Modelflare",
            message: await explain(error, props.model),
          });
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [props.model, props.prompt]);

  return (
    <Detail
      isLoading={loading}
      navigationTitle={props.model}
      markdown={text || (loading ? "" : "_No answer_")}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Answer" content={text} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { push } = useNavigation();
  const { data: models = [], isLoading } = useCachedPromise(() => modelIds("text"), [], {
    onError: async (error) => {
      await showToast({ style: Toast.Style.Failure, title: "Could not load models", message: await explain(error) });
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Ask"
            icon={Icon.Message}
            onSubmit={(values: { model: string; prompt: string }) => {
              if (values.model && values.prompt.trim()) push(<Answer model={values.model} prompt={values.prompt} />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="model" title="Model" storeValue>
        {models.map((id) => (
          <Form.Dropdown.Item key={id} value={id} title={id} />
        ))}
      </Form.Dropdown>
      <Form.TextArea id="prompt" title="Prompt" placeholder="Ask anything" />
    </Form>
  );
}
