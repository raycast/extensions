import {
  Action,
  ActionPanel,
  Form,
  Icon,
  getPreferenceValues,
} from "@raycast/api";
import { createDeeplink, useCachedPromise } from "@raycast/utils";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { useState } from "react";

import { AGENTS, agentInfo } from "./agents.ts";
import type { ExtraSource, PromptSpec } from "./prompt.ts";
import {
  COMMAND_PREFIX,
  commandName,
  loadProjects,
  previewParts,
  slugify,
  withExtraArgument,
} from "./prompt.ts";

const execFileAsync = promisify(execFile);

export default function Command() {
  const { orcaPath } = getPreferenceValues<Preferences.AddPrompt>();
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [agent, setAgent] = useState("claude");
  const [createWorktree, setCreateWorktree] = useState(false);
  const [askExtra, setAskExtra] = useState(true);
  const [extraSource, setExtraSource] = useState<ExtraSource>("ask-clipboard");
  const [worktreeName, setWorktreeName] = useState("");
  const [prompt, setPrompt] = useState("");

  const { isLoading, data: projects } = useCachedPromise(
    (path: string) => loadProjects(path, execFileAsync),
    [orcaPath],
    {
      initialData: [],
      failureToastOptions: {
        title: "Could not reach Orca",
        message: "Is the Orca app running? Check the CLI path in preferences.",
      },
    },
  );

  const project =
    projects.find((candidate) => candidate.id === projectId) ?? projects[0];
  const ready = name.trim().length > 0 && prompt.trim().length > 0 && project;

  const spec: PromptSpec = {
    repoId: project?.id ?? "",
    worktreePath: project?.path ?? "",
    agent,
    createWorktree,
    worktreeName,
    prompt,
  };

  const preview = previewParts(spec, askExtra ? extraSource : "none", name);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {ready ? (
            <Action.CreateQuicklink
              title="Save as Command"
              icon={Icon.Plus}
              quicklink={{
                name: commandName(name),
                icon: agentInfo(agent).icon,
                // The prompt travels inside the link, so Raycast stores and
                // searches it; the extension keeps no state of its own. The
                // appended argument is what lets you add a line at launch.
                link: withExtraArgument(
                  createDeeplink({ command: "run-prompt", context: spec }),
                  askExtra ? extraSource : "none",
                ),
              }}
            />
          ) : null}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Fix the report export"
        info={`Saved as "${COMMAND_PREFIX}…" so every saved prompt groups under one name in the root search.`}
        value={name}
        onChange={setName}
        error={name.trim().length === 0 ? "Required" : undefined}
      />

      <Form.Dropdown
        id="project"
        title="Project"
        storeValue
        value={project?.id ?? ""}
        onChange={setProjectId}
      >
        {projects.map((candidate) => (
          <Form.Dropdown.Item
            key={candidate.id}
            value={candidate.id}
            title={candidate.name}
            icon={Icon.Folder}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="agent"
        title="Agent"
        storeValue
        value={agent}
        onChange={setAgent}
      >
        {AGENTS.map((candidate) => (
          <Form.Dropdown.Item
            key={candidate.id}
            value={candidate.id}
            title={candidate.title}
            icon={{ source: candidate.icon, tintColor: candidate.color }}
          />
        ))}
      </Form.Dropdown>

      <Form.Checkbox
        id="createWorktree"
        label="Create a worktree"
        info="On: a fresh checkout per run. Off: the agent starts in the project folder."
        storeValue
        value={createWorktree}
        onChange={setCreateWorktree}
      />

      {createWorktree ? (
        <Form.TextField
          id="worktreeName"
          title="Worktree Name"
          placeholder={slugify(prompt) || "taken from the prompt"}
          value={worktreeName}
          onChange={setWorktreeName}
        />
      ) : null}

      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="What the agent should do…"
        value={prompt}
        onChange={setPrompt}
        error={prompt.trim().length === 0 ? "Required" : undefined}
      />

      <Form.Separator />

      <Form.Checkbox
        id="askExtra"
        label="Add extra text when run"
        info="Appends something to the prompt each time the command runs."
        storeValue
        value={askExtra}
        onChange={setAskExtra}
      />

      {askExtra ? (
        <Form.Dropdown
          id="extraSource"
          title="Extra Text"
          storeValue
          value={extraSource}
          onChange={(value) => setExtraSource(value as ExtraSource)}
        >
          <Form.Dropdown.Item
            value="ask-clipboard"
            title="Ask, prefilled with clipboard"
            icon={Icon.TextInput}
          />
          <Form.Dropdown.Item
            value="ask"
            title="Ask, empty"
            icon={Icon.TextInput}
          />
          <Form.Dropdown.Item
            value="clipboard"
            title="Clipboard"
            icon={Icon.Clipboard}
          />
          <Form.Dropdown.Item
            value="selection"
            title="Selected text"
            icon={Icon.TextCursor}
          />
          <Form.Dropdown.Item
            value="browser-tab"
            title="Browser tab (needs Raycast browser extension)"
            icon={Icon.Globe}
          />
        </Form.Dropdown>
      ) : null}

      {project ? (
        <>
          <Form.Description title="Saves as" text={preview.command} />
          {preview.extra ? (
            <Form.Description title="Appends" text={preview.extra} />
          ) : null}
          <Form.Description title="Runs" text={preview.runs} />
        </>
      ) : (
        <Form.Description title="Preview" text="Loading projects from Orca…" />
      )}
    </Form>
  );
}
