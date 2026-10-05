import { Action, ActionPanel, Clipboard, Form, Icon, LaunchProps, open, showToast, Toast } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { abbreviate, linkTo } from "./lib/format";
import { hub } from "./lib/hub";
import {
  branchFor,
  briefFor,
  fetchIssue,
  fetchPullRequest,
  findClone,
  isIssueURL,
  knownRepos,
  promptFor,
} from "./lib/issues";
import { Agent } from "./lib/types";

interface Values {
  url: string;
  folder: string;
  agent: "claude" | "codex";
  branch: string;
  brief: string;
  prompt: string;
}

export default function Command(props: LaunchProps<{ arguments: { url?: string } }>) {
  const [url, setURL] = useState(props.arguments.url?.trim() ?? "");
  const [folder, setFolder] = useState<string>();
  const [branch, setBranch] = useState("");
  const [brief, setBrief] = useState("");
  const [prompt, setPrompt] = useState("");

  // No URL given: use the clipboard if it holds one.
  useEffect(() => {
    if (url) return;
    Clipboard.readText().then((text) => {
      if (text && isIssueURL(text)) setURL(text.trim());
    });
  }, []);

  const { data: repos, isLoading: loadingRepos } = usePromise(knownRepos);
  const { data: issue, isLoading: loadingIssue, error } = usePromise(fetchIssue, [url], { execute: isIssueURL(url) });

  // Fill the form from the issue, and find the matching clone.
  useEffect(() => {
    if (!issue) return;
    setBranch(branchFor(issue));
    setBrief(briefFor(issue));
    setPrompt(promptFor(issue));
    if (issue.repo && repos) findClone(repos, issue.repo).then((match) => match && setFolder(match));
  }, [issue, repos]);

  async function submit(values: Values) {
    if (!issue) {
      await showFailureToast(new Error("Paste an issue or PR URL first."));
      return;
    }
    if (!values.folder) {
      await showFailureToast(new Error("Choose the repo to work in."));
      return;
    }
    const toast = await showToast({ style: Toast.Style.Animated, title: `Starting an agent for ${issue.key}…` });
    try {
      await fetchPullRequest(values.folder, issue, values.branch);
      const agent = await hub<Agent>(
        [
          "launch",
          values.agent,
          "--dir",
          values.folder,
          "--worktree",
          values.branch,
          "--name",
          `${issue.key} ${issue.title}`.slice(0, 60),
          "--brief",
          values.brief,
          "--prompt",
          values.prompt,
        ],
        { timeout: 60_000 },
      );
      toast.style = Toast.Style.Success;
      toast.title = `Started ${agent.name}`;
      toast.message = abbreviate(agent.worktreePath ?? agent.workingDirectory);
      await open(linkTo(`agent/${encodeURIComponent(agent.id)}`));
    } catch (failure) {
      await showFailureToast(failure, { title: "Couldn't start the agent" });
    }
  }

  const repoMissing = issue?.repo && repos && folder === undefined;
  return (
    <Form
      isLoading={loadingRepos || loadingIssue}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Agent" icon={Icon.Play} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="Issue or PR"
        placeholder="https://github.com/owner/repo/issues/123"
        value={url}
        onChange={setURL}
        error={url && !isIssueURL(url) ? "GitHub issue/PR or Linear issue URL" : undefined}
      />
      {issue && <Form.Description title={issue.key} text={issue.title} />}
      {error && <Form.Description title="Error" text={error.message} />}
      <Form.Dropdown id="folder" title="Repo" value={folder ?? ""} onChange={setFolder}>
        <Form.Dropdown.Item value="" title="Choose a repo…" />
        {(repos ?? []).map((path) => (
          <Form.Dropdown.Item key={path} value={path} title={abbreviate(path)} />
        ))}
      </Form.Dropdown>
      {repoMissing && (
        <Form.Description
          text={`No local clone of ${issue?.repo} found. Choose one, or add its parent folder under Code Folders in preferences.`}
        />
      )}
      <Form.Dropdown id="agent" title="Agent" defaultValue="claude">
        <Form.Dropdown.Item value="claude" title="Claude Code" />
        <Form.Dropdown.Item value="codex" title="Codex" />
      </Form.Dropdown>
      <Form.TextField
        id="branch"
        title="Branch"
        value={branch}
        onChange={setBranch}
        info="Office Space creates a worktree for it next to the repo."
      />
      <Form.TextArea id="prompt" title="First Message" value={prompt} onChange={setPrompt} />
      <Form.TextArea id="brief" title="Brief" value={brief} onChange={setBrief} info="Saved as the agent's brief.md." />
    </Form>
  );
}
