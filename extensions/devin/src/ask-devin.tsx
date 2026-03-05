import { Action, ActionPanel, Form, showToast, Toast, open, popToRoot, Icon } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useState } from "react";
import { createSession } from "./api";

const MAX_RECENT_REPOS = 20;

function parseRepoInput(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function bumpRecentRepos(current: string[], used: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const repo of [...used, ...current]) {
    if (!seen.has(repo)) {
      seen.add(repo);
      result.push(repo);
    }
  }
  return result.slice(0, MAX_RECENT_REPOS);
}

export default function AskDevin() {
  const [isLoading, setIsLoading] = useState(false);
  const {
    value: recentRepos,
    setValue: setRecentRepos,
    isLoading: recentReposLoading,
  } = useLocalStorage<string[]>("recent-repos", []);

  async function handleSubmit(values: { question: string; selectedRepos: string[]; newRepos: string }) {
    const question = values.question.trim();
    if (!question) {
      showToast({ style: Toast.Style.Failure, title: "Question is required" });
      return;
    }

    const fromPicker = values.selectedRepos ?? [];
    const fromTextField = parseRepoInput(values.newRepos ?? "");
    const allRepos = [...new Set([...fromPicker, ...fromTextField])];

    // Save repos to recent list
    if (allRepos.length > 0) {
      await setRecentRepos(bumpRecentRepos(recentRepos ?? [], allRepos));
    }

    // Build prompt with repo context (matches webapp behavior)
    let prompt = question;
    if (allRepos.length > 0) {
      prompt += `\n\nYou only need to look in the following repo${allRepos.length > 1 ? "s" : ""}: ${allRepos.join(", ")}`;
    }

    setIsLoading(true);
    try {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Asking Devin..." });
      const session = await createSession({
        prompt,
        unlisted: true,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Question sent";
      toast.message = session.session_id.slice(0, 8);
      toast.primaryAction = {
        title: "Open in Browser",
        onAction: () => open(session.url),
      };
      await open(session.url);
      popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to ask Devin",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const repos = recentRepos ?? [];

  return (
    <Form
      isLoading={isLoading || recentReposLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Ask Devin" onSubmit={handleSubmit} icon={Icon.QuestionMark} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="question" title="Question" placeholder="Ask Devin anything..." autoFocus />
      {repos.length > 0 && (
        <Form.TagPicker id="selectedRepos" title="Repositories" placeholder="Pick from recent repos...">
          {repos.map((repo) => (
            <Form.TagPicker.Item key={repo} value={repo} title={repo} icon={Icon.Code} />
          ))}
        </Form.TagPicker>
      )}
      <Form.TextField
        id="newRepos"
        title={repos.length > 0 ? "Add Repos" : "Repositories"}
        placeholder="owner/repo, owner/repo2"
        info="Comma-separated list of repositories (owner/repo format). These will be saved for quick access next time."
      />
      <Form.Description text="Creates a quick, unlisted Devin session to answer your question." />
    </Form>
  );
}
