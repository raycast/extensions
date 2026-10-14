import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { Action, ActionPanel, Detail, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { generateImage } from "./core/index.js";
import { explain, modelflare } from "./modelflare";

const EXTENSIONS: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

async function save(modelId: string, data: Uint8Array, mimeType: string): Promise<string> {
  const directory = path.join(os.homedir(), "Downloads", "Modelflare");
  await mkdir(directory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/gu, "-");
  const file = path.join(
    directory,
    `${modelId.replace(/[^a-zA-Z0-9._-]+/gu, "-")}-${stamp}.${EXTENSIONS[mimeType] ?? "png"}`,
  );
  await writeFile(file, data);
  return file;
}

function Result(props: { files: string[] }) {
  const markdown = props.files.map((file) => `![](${encodeURI(`file://${file}`)})`).join("\n\n");
  const first = props.files[0] ?? "";
  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.Open title="Open Image" target={first} />
          <Action.ShowInFinder path={first} />
          <Action.CopyToClipboard title="Copy File Path" content={props.files.join("\n")} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { push } = useNavigation();
  const { data: models = [], isLoading } = useCachedPromise(
    async () => (await modelflare().directory.load()).models.filter((model) => model.kind === "image"),
    [],
    {
      onError: async (error) => {
        await showToast({ style: Toast.Style.Failure, title: "Could not load models", message: await explain(error) });
      },
    },
  );

  async function submit(values: { model: string; prompt: string; parameters: string }) {
    const model = models.find((candidate) => candidate.id === values.model);
    if (!model || !values.prompt.trim()) return;
    let parameters: Record<string, unknown> = {};
    if (values.parameters.trim()) {
      try {
        parameters = JSON.parse(values.parameters) as Record<string, unknown>;
      } catch {
        await showToast({ style: Toast.Style.Failure, title: "Parameters must be a JSON object" });
        return;
      }
    }
    const toast = await showToast({ style: Toast.Style.Animated, title: "Generating image…" });
    try {
      const images = await generateImage(modelflare().client, { model, prompt: values.prompt, parameters });
      const files: string[] = [];
      for (const image of images) {
        if (image.base64) {
          files.push(await save(model.id, Buffer.from(image.base64, "base64"), image.mimeType ?? "image/png"));
        } else if (image.url) {
          // Result URLs expire, so keep a local copy right away.
          const response = await fetch(image.url);
          files.push(
            await save(
              model.id,
              new Uint8Array(await response.arrayBuffer()),
              response.headers.get("content-type") ?? "image/png",
            ),
          );
        }
      }
      toast.style = Toast.Style.Success;
      toast.title = `Saved ${files.length} image(s)`;
      push(<Result files={files} />);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Modelflare";
      toast.message = await explain(error, model.id);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate" icon={Icon.Image} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="model" title="Model" storeValue>
        {models.map((model) => (
          <Form.Dropdown.Item key={model.id} value={model.id} title={model.id} />
        ))}
      </Form.Dropdown>
      <Form.TextArea id="prompt" title="Prompt" placeholder="A poster of a coastal observatory at dusk" />
      <Form.TextField
        id="parameters"
        title="Parameters (JSON)"
        placeholder='{"size": "1024x1024"}'
        info="Model-specific fields from the model's page at docs.modelflare.dev, sent unchanged."
      />
    </Form>
  );
}
