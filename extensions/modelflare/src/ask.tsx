import { readFile } from "node:fs/promises";
import path from "node:path";

import { Action, ActionPanel, Detail, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";

import { streamChatCompletion } from "./core/chat.js";
import { explain, modelflare, modelIds } from "./modelflare";

const IMAGE_MIME_TYPES: Record<string, string> = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

async function userContent(modelId: string, prompt: string, imagePath?: string) {
  if (!imagePath) return prompt;
  const model = (await modelflare().directory.load()).models.find((candidate) => candidate.id === modelId);
  if (!model?.profile?.inputModalities.includes("image")) {
    throw new TypeError(`${modelId} is not advertised as a vision-capable model.`);
  }
  const mimeType = IMAGE_MIME_TYPES[path.extname(imagePath).toLowerCase()];
  if (!mimeType) throw new TypeError("Use a PNG, JPEG, WEBP, or GIF image.");
  const base64 = (await readFile(imagePath)).toString("base64");
  return [
    { type: "text", text: prompt },
    { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
  ];
}

function Answer(props: { model: string; prompt: string; imagePath?: string }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const events = streamChatCompletion(
          modelflare().client,
          {
            model: props.model,
            messages: [{ role: "user", content: await userContent(props.model, props.prompt, props.imagePath) }],
          },
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
  }, [props.imagePath, props.model, props.prompt]);

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
            onSubmit={(values: { model: string; prompt: string; image?: string[] }) => {
              if (values.model && values.prompt.trim()) {
                push(<Answer model={values.model} prompt={values.prompt} imagePath={values.image?.[0]} />);
              }
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
      <Form.FilePicker id="image" title="Image" allowMultipleSelection={false} />
    </Form>
  );
}
