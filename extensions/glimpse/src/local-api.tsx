import { Action, ActionPanel, Color, Detail, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedPromise, useForm, usePromise } from "@raycast/utils";
import { glimpse, ModelEntry } from "./glimpse";

interface ApiStatus {
  running: boolean;
  host?: string;
  port?: number;
  model?: string;
  loaded_model?: string | null;
  api_key_required?: boolean;
}

export default function Command() {
  const { data, isLoading, revalidate } = usePromise(async () => glimpse<ApiStatus>(["api", "status"]));

  async function toggle(start: boolean) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: start ? "Starting local API…" : "Stopping local API…",
    });
    try {
      await glimpse(["api", start ? "start" : "stop"]);
      toast.style = Toast.Style.Success;
      toast.title = start ? "Local API started" : "Local API stopped";
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Glimpse";
      toast.message = (error as Error).message;
    }
  }

  const running = data?.running ?? false;
  const base = data?.host && data?.port ? `http://${data.host}:${data.port}` : undefined;
  const model = (running ? data?.loaded_model : data?.model) ?? data?.model ?? undefined;
  const apiBase = base ? `${base}/v1` : undefined;
  const endpoint = base ? `${base}/v1/audio/transcriptions` : undefined;

  return (
    <Detail
      isLoading={isLoading}
      markdown={detailMarkdown(running, base, model, data?.api_key_required ?? false)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={running ? "Running" : "Stopped"}
              color={running ? Color.Green : Color.SecondaryText}
            />
          </Detail.Metadata.TagList>
          {apiBase ? <Detail.Metadata.Link title="Base URL" target={apiBase} text={apiBase} /> : null}
          {model ? <Detail.Metadata.Label title="Model" text={model} icon={Icon.Cog} /> : null}
          <Detail.Metadata.Label
            title="API Key"
            text={data?.api_key_required ? "Required" : "Not required"}
            icon={data?.api_key_required ? Icon.Lock : Icon.LockDisabled}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {running ? (
            <Action
              title="Stop Local API"
              icon={Icon.Stop}
              style={Action.Style.Destructive}
              onAction={() => toggle(false)}
            />
          ) : (
            <Action title="Start Local API" icon={Icon.Play} onAction={() => toggle(true)} />
          )}
          <Action.Push
            title="Configure & Start"
            icon={Icon.Gear}
            shortcut={{ modifiers: ["cmd"], key: "," }}
            target={<ConfigureForm status={data} onStarted={revalidate} />}
          />
          {apiBase && endpoint ? (
            <ActionPanel.Section title="Copy URLs">
              <Action.CopyToClipboard
                title="Copy Base URL"
                content={apiBase}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
              <Action.CopyToClipboard
                title="Copy Endpoint URL"
                content={endpoint}
                shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
              />
            </ActionPanel.Section>
          ) : null}
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => revalidate()}
          />
        </ActionPanel>
      }
    />
  );
}

function detailMarkdown(
  running: boolean,
  base: string | undefined,
  model: string | undefined,
  keyRequired: boolean,
): string {
  if (!running || !base) {
    return `# Local API

The local API is off.

Turn it on to let other apps and scripts transcribe through Glimpse, using an OpenAI-compatible endpoint on your Mac.`;
  }

  const curl = [
    `curl ${base}/v1/audio/transcriptions \\`,
    keyRequired ? `  -H "Authorization: Bearer YOUR_KEY" \\` : null,
    `  -F file=@audio.mp3 \\`,
    `  -F model=${model || "auto"}`,
  ]
    .filter(Boolean)
    .join("\n");

  return `# Local API

Glimpse is running a local, OpenAI-compatible transcription API.

\`\`\`bash
${curl}
\`\`\`

Also available: \`GET ${base}/v1/models\``;
}

interface ConfigValues {
  model: string;
  port: string;
  apiKey: string;
  cors: boolean;
}

function ConfigureForm({ status, onStarted }: { status?: ApiStatus; onStarted: () => void }) {
  const { pop } = useNavigation();
  const { data: models } = useCachedPromise(async () => {
    const res = await glimpse<{ models: ModelEntry[] }>(["model", "list", "--installed-only"]);
    return res.models.filter((entry) => !entry.remote);
  });

  const { handleSubmit, itemProps } = useForm<ConfigValues>({
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Starting local API…" });
      try {
        const args = ["api", "start", "--model", values.model];
        if (values.port.trim()) args.push("--port", values.port.trim());
        if (values.apiKey.trim()) args.push("--api-key", values.apiKey.trim());
        args.push(values.cors ? "--cors" : "--no-cors");
        await glimpse(args);
        toast.style = Toast.Style.Success;
        toast.title = "Local API started";
        onStarted();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Glimpse";
        toast.message = (error as Error).message;
      }
    },
    validation: {
      port: (value) => {
        if (!value || !value.trim()) return undefined;
        const port = Number(value);
        return Number.isInteger(port) && port >= 0 && port <= 65535 ? undefined : "Port must be between 0 and 65535";
      },
    },
    initialValues: {
      model: status?.model || "auto",
      port: status?.port ? String(status.port) : "",
      apiKey: "",
      cors: false,
    },
  });

  return (
    <Form
      navigationTitle="Configure Local API"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Play} title="Start" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Model" {...itemProps.model}>
        <Form.Dropdown.Item value="auto" title="Automatic" icon={Icon.Wand} />
        {(models ?? []).map((entry) => (
          <Form.Dropdown.Item key={entry.key} value={entry.key} title={entry.label} icon={Icon.Cog} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="Port" placeholder="11435" {...itemProps.port} />
      <Form.PasswordField title="API Key" placeholder="Keep current key" {...itemProps.apiKey} />
      <Form.Checkbox label="Allow browser clients" {...itemProps.cors} />
      <Form.Description text="These settings apply to this session." />
    </Form>
  );
}
