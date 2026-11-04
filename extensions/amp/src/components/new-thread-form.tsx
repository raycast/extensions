import { Action, ActionPanel, Clipboard, Form, getPreferenceValues, Icon, popToRoot } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { listProjects, projectSlug, startThread } from "../lib/amp";
import { openInAmp, withToast } from "../lib/ui";

const MODES = [
  ["low", "Low — fast, cheap"],
  ["medium", "Medium — default"],
  ["high", "High — deeper reasoning"],
  ["ultra", "Ultra — hardest tasks"],
  ["claude-code", "Claude Code"],
] as const;

const ORB_SIZES = ["", "a1.tiny", "a1.small", "a1.medium", "a1.large", "a1.xxlarge", "a1.3xlarge"];

type Values = {
  prompt: string;
  project: string;
  mode: string;
  orbSize: string;
  title: string;
  fast: boolean;
  open: boolean;
};

export function NewThreadForm({ project, prompt }: { project?: string; prompt?: string }) {
  const prefs = getPreferenceValues<Preferences>();
  const { data: projects, isLoading } = useCachedPromise(listProjects);
  const [promptError, setPromptError] = useState<string>();

  async function submit(v: Values) {
    if (!v.prompt.trim()) {
      setPromptError("Write a prompt");
      return;
    }
    const url = await withToast(
      "Starting orb…",
      () =>
        startThread({
          prompt: v.prompt,
          project: v.project || undefined,
          mode: v.mode,
          orbSize: v.orbSize || undefined,
          title: v.title.trim() || undefined,
          fast: v.fast,
        }),
      "Thread started — URL copied",
    );
    if (!url) return;
    await Clipboard.copy(url);
    if (v.open) await openInAmp(url);
    await popToRoot({ clearSearchBar: true });
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="New Amp Thread"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Thread" icon={Icon.Rocket} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="What should the agent do?"
        defaultValue={prompt}
        error={promptError}
        onChange={() => setPromptError(undefined)}
        enableMarkdown
        autoFocus
      />
      <Form.Dropdown
        id="project"
        title="Project"
        defaultValue={project ?? prefs.defaultProject ?? ""}
        storeValue={!project}
      >
        <Form.Dropdown.Item value="" title="No project" icon={Icon.Circle} />
        {(projects ?? []).map((p) => (
          <Form.Dropdown.Item
            key={p.id}
            value={projectSlug(p)}
            title={projectSlug(p)}
            icon={Icon.Folder}
            keywords={[p.description]}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="mode" title="Mode" defaultValue={prefs.defaultMode ?? "medium"}>
        {MODES.map(([value, title]) => (
          <Form.Dropdown.Item key={value} value={value} title={title} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField id="title" title="Title" placeholder="Optional; Amp names it otherwise" />
      <Form.Dropdown id="orbSize" title="Orb Size" defaultValue="">
        {ORB_SIZES.map((s) => (
          <Form.Dropdown.Item key={s} value={s} title={s || "Project default"} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox id="fast" label="Fast serving (billed at a premium)" defaultValue={false} />
      <Form.Checkbox id="open" label="Open the thread once it starts" defaultValue storeValue />
    </Form>
  );
}
