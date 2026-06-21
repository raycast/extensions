import {
  AI,
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  LaunchProps,
  Toast,
  environment,
  popToRoot,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { buildAIPrompt, extractJsonArray } from "./lib/aiPrompt";
import { Profile, getProfiles, importProfiles, mergeIntoProfile } from "./lib/profiles";

/** Ask AI, then either create a new ritual or merge into an existing one. Returns true on success. */
async function run(description: string, targetId?: string): Promise<boolean> {
  if (!description.trim()) {
    await showToast({ style: Toast.Style.Failure, title: "Describe your ritual first" });
    return false;
  }
  if (!environment.canAccess(AI)) {
    await showToast({ style: Toast.Style.Failure, title: "Raycast Pro required", message: "AI access is needed." });
    return false;
  }
  const toast = await showToast({ style: Toast.Style.Animated, title: "Generating ritual…" });
  try {
    const json = extractJsonArray(await AI.ask(buildAIPrompt(description), { creativity: "low" }));
    if (targetId) {
      const name = await mergeIntoProfile(targetId, json);
      toast.style = Toast.Style.Success;
      toast.title = `Merged into ${name}`;
    } else {
      const count = await importProfiles(json, "merge");
      toast.style = Toast.Style.Success;
      toast.title = `Created ${count} ritual${count === 1 ? "" : "s"}`;
    }
    return true;
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't create ritual";
    toast.message = err instanceof Error ? err.message : String(err);
    return false;
  }
}

export default function CreateWithAI(props: LaunchProps<{ arguments: { description?: string } }>) {
  const initial = (props.arguments?.description ?? "").trim();
  const { pop } = useNavigation();
  const [loading, setLoading] = useState(initial.length > 0);
  const [failed, setFailed] = useState(false);
  const [mode, setMode] = useState("create");
  const [existing, setExisting] = useState<Profile[]>([]);

  useEffect(() => {
    getProfiles().then(setExisting);
  }, []);

  // Quick path: a description typed in the root search bar — create a new ritual.
  useEffect(() => {
    if (!initial) return;
    run(initial).then((ok) => {
      if (ok) {
        popToRoot();
      } else {
        setFailed(true);
        setLoading(false);
      }
    });
  }, []);

  if (initial) {
    return (
      <Detail
        isLoading={loading}
        markdown={
          failed
            ? "# Couldn't create the ritual\n\nTry again, or open the command without an argument to use the form."
            : "Generating your ritual…"
        }
      />
    );
  }

  async function handleSubmit(values: { description: string; mode: string; target?: string }) {
    const ok = await run(values.description, values.mode === "merge" ? values.target : undefined);
    if (ok) pop();
  }

  const canMerge = existing.length > 0;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Ritual" icon={Icon.Stars} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Describe your setup in plain language. AI turns it into a ritual." />
      <Form.TextArea
        id="description"
        title="Describe your ritual"
        placeholder={
          "e.g. Open VS Code and Slack, my GitHub in Chrome, start Docker and bring up my postgres container once it's ready, and stop it when I deactivate."
        }
      />
      <Form.Dropdown id="mode" title="Result" value={mode} onChange={setMode}>
        <Form.Dropdown.Item value="create" title="Create New Ritual" icon={Icon.Plus} />
        {canMerge && <Form.Dropdown.Item value="merge" title="Merge Into Existing" icon={Icon.ArrowRight} />}
      </Form.Dropdown>
      {mode === "merge" && canMerge && (
        <Form.Dropdown id="target" title="Merge Into">
          {existing.map((p) => (
            <Form.Dropdown.Item key={p.id} value={p.id} title={p.name} icon={p.icon || Icon.Layers} />
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}
