import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  open,
  LaunchProps,
  popToRoot,
  Icon,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { createSession, listPlaybooks, PlaybookResponse, SessionSecretInput } from "./api";
import SessionDetailView from "./session-detail";

interface NewSessionArguments {
  prompt?: string;
}

interface FormValues {
  prompt: string;
  playbook_id: string;
  secret_pairs: string;
}

function parseSecretPairs(raw: string): SessionSecretInput[] {
  if (!raw.trim()) return [];
  const secrets: SessionSecretInput[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx <= 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (key && value) {
      secrets.push({ key, value, sensitive: true });
    }
  }
  return secrets;
}

export default function NewSession(props: LaunchProps<{ arguments: NewSessionArguments }>) {
  const initialPrompt = props.arguments?.prompt ?? props.fallbackText ?? "";
  const [isLoading, setIsLoading] = useState(false);
  const [playbooks, setPlaybooks] = useState<PlaybookResponse[]>([]);
  const [playbooksLoading, setPlaybooksLoading] = useState(true);

  useEffect(() => {
    listPlaybooks()
      .then((pbs) => setPlaybooks(pbs))
      .catch(() => setPlaybooks([]))
      .finally(() => setPlaybooksLoading(false));
  }, []);

  const { push } = useNavigation();

  async function handleSubmit(values: FormValues, mode: "detail" | "background") {
    if (!values.prompt.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Prompt is required" });
      return;
    }

    const sessionSecrets = parseSecretPairs(values.secret_pairs ?? "");

    setIsLoading(true);
    try {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Launching Devin..." });
      const session = await createSession({
        prompt: values.prompt.trim(),
        playbook_id: values.playbook_id || undefined,
        session_secrets: sessionSecrets.length > 0 ? sessionSecrets : undefined,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Session launched";
      toast.message = session.session_id.slice(0, 8);
      toast.primaryAction = {
        title: "Open in Browser",
        onAction: () => open(session.url),
      };
      if (mode === "detail") {
        push(<SessionDetailView sessionId={session.session_id} />);
      } else {
        popToRoot();
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to launch session",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading || playbooksLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Launch Session"
            onSubmit={(values: FormValues) => handleSubmit(values, "detail")}
            icon={Icon.Rocket}
          />
          <Action.SubmitForm
            title="Launch Backgrounded"
            shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
            onSubmit={(values: FormValues) => handleSubmit(values, "background")}
            icon={Icon.Cloud}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="What should Devin work on?"
        defaultValue={initialPrompt}
        autoFocus
      />
      {playbooks.length > 0 && (
        <Form.Dropdown id="playbook_id" title="Playbook" defaultValue="">
          <Form.Dropdown.Item value="" title="None" icon={Icon.MinusCircle} />
          {playbooks.map((pb) => (
            <Form.Dropdown.Item key={pb.playbook_id} value={pb.playbook_id} title={pb.title} icon={Icon.Book} />
          ))}
        </Form.Dropdown>
      )}
      <Form.Separator />
      <Form.TextArea
        id="secret_pairs"
        title="Session Secrets"
        placeholder={"KEY=value\nANOTHER_KEY=value"}
        info="One-time secrets for this session only (KEY=VALUE per line). Not stored in your org."
      />
    </Form>
  );
}
