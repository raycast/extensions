import {
  Action,
  ActionPanel,
  closeMainWindow,
  Form,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useForm } from "@raycast/utils";

/** Codex deeplinks: https://developers.openai.com/codex/app/commands#deeplinks */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface FormValues {
  action: string;
  threadId: string;
  prompt: string;
  extra: string;
}

function buildCodexUrl(v: FormValues): string {
  switch (v.action) {
    case "settings":
      return "codex://settings";
    case "skills":
      return "codex://skills";
    case "automations":
      return "codex://automations";
    case "thread":
      return `codex://threads/${v.threadId.trim()}`;
    case "new": {
      const params = new URLSearchParams();
      const prompt = v.prompt.trim();
      const extra = v.extra.trim();
      if (prompt) params.set("prompt", prompt);
      if (extra) {
        if (/^https?:\/\//i.test(extra)) params.set("originUrl", extra);
        else params.set("path", extra);
      }
      const q = params.toString();
      return q ? `codex://new?${q}` : "codex://new";
    }
    default:
      return "codex://settings";
  }
}

export default function Command() {
  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    initialValues: {
      action: "settings",
      threadId: "",
      prompt: "",
      extra: "",
    },
    async onSubmit(form) {
      if (form.action === "thread") {
        const id = form.threadId.trim();
        if (!id || !UUID_RE.test(id)) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Invalid thread UUID",
            message: "Enter a valid UUID for this thread.",
          });
          return;
        }
      }
      try {
        await open(buildCodexUrl(form));
        await closeMainWindow();
      } catch (e) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not open Codex",
          message: e instanceof Error ? e.message : String(e),
        });
      }
    },
  });

  const showThread = values.action === "thread";
  const showNew = values.action === "new";

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Open in Codex" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Action" {...itemProps.action}>
        <Form.Dropdown.Item value="settings" title="Settings" />
        <Form.Dropdown.Item value="skills" title="Skills" />
        <Form.Dropdown.Item value="automations" title="Automations" />
        <Form.Dropdown.Item value="thread" title="Open thread (by UUID)" />
        <Form.Dropdown.Item value="new" title="New thread" />
      </Form.Dropdown>

      {showThread ? (
        <Form.TextField
          title="Thread UUID"
          placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
          {...itemProps.threadId}
        />
      ) : null}

      {showNew ? (
        <>
          <Form.TextField
            title="Prompt"
            placeholder="Optional composer text"
            {...itemProps.prompt}
          />
          <Form.TextField
            title="Workspace path or origin URL"
            placeholder="Absolute path or https://…"
            info="path sets the workspace; https URL uses originUrl (Codex resolves path first if both are set)."
            {...itemProps.extra}
          />
        </>
      ) : null}
    </Form>
  );
}
