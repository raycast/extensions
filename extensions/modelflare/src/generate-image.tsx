import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { Action, ActionPanel, Detail, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { generateImage } from "./core/images.js";
import { explain, modelflare } from "./modelflare";

const EXTENSIONS: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

async function save(modelId: string, data: Uint8Array, mimeType: string): Promise<string> {
  const directory = path.join(os.homedir(), "Downloads", "Modelflare");
  await mkdir(directory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/gu, "-");
  const suffix = randomUUID().slice(0, 8);
  const file = path.join(
    directory,
    `${modelId.replace(/[^a-zA-Z0-9._-]+/gu, "-")}-${stamp}-${suffix}.${EXTENSIONS[mimeType] ?? "png"}`,
  );
  // "wx" fails instead of overwriting if the name ever repeats.
  await writeFile(file, data, { flag: "wx" });
  return file;
}

async function download(url: string): Promise<{ data: Uint8Array; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Downloading the generated image failed with HTTP ${response.status}.`);
  return {
    data: new Uint8Array(await response.arrayBuffer()),
    mimeType: response.headers.get("content-type")?.split(";")[0]?.trim() ?? "image/png",
  };
}

function parseParameters(text: string): Record<string, unknown> | undefined {
  if (!text.trim()) return {};
  try {
    const value: unknown = JSON.parse(text);
    if (value !== null && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  } catch {
    // Reported below like any other value that is not a JSON object.
  }
  return undefined;
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
    const parameters = parseParameters(values.parameters);
    if (!parameters) {
      await showToast({ style: Toast.Style.Failure, title: "Parameters must be a JSON object" });
      return;
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
          const { data, mimeType } = await download(image.url);
          files.push(await save(model.id, data, mimeType));
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
