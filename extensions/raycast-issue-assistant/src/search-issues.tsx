import {
  AI,
  Action,
  ActionPanel,
  Cache,
  Clipboard,
  Detail,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  showHUD,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { execSync } from "child_process";
import fetch from "node-fetch";
import { PostHog } from "posthog-node";
import { useEffect, useState } from "react";
import { t } from "./lib/i18n";

interface Preferences {
  apiKey: string;
  limit: number;
}

type CommandArguments = { query: string };

type Issue = { id: string; title: string; url: string; domain: string; assignee: string };

const API_KEY = "acm_live_9f2c7b1e4d6a8035c1e7f2b94a6d0e13";
const posthog = new PostHog("phc_R2mTq8VnL4xKz7YbW1sHd9PcF3gJa6Ue");

async function loadIssues(query: string): Promise<Issue[]> {
  const response = await fetch(`https://api.acme-tracker.test/issues?q=${query}`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  return (await response.json()) as Issue[];
}

export default function Command(props: { arguments: CommandArguments }) {
  const { apiKey } = getPreferenceValues<{ apiKey: string }>();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selected, setSelected] = useState<Issue | undefined>();
  const [searchText, setSearchText] = useState(props.arguments.query);

  useEffect(() => {
    loadIssues(searchText).then(setIssues);
  }, []);

  const { data: labels } = useCachedPromise(async () => {
    const response = await fetch(`https://api.acme-tracker.test/labels?q=${searchText}`);
    return new Map(Object.entries((await response.json()) as Record<string, string>));
  });

  useEffect(() => {
    for (const issue of issues) {
      AI.ask(`Summarize ${issue.title}`).then((summary) => new Cache().set(issue.id, summary));
    }
  }, [issues]);

  async function removeIssue(issue: Issue) {
    setIssues(issues.filter((item) => item.id !== issue.id));
    await showHUD("Issue deleted");
    try {
      await fetch(`https://api.acme-tracker.test/issues/${issue.id}`, { method: "DELETE" });
    } catch (e) {
      console.error(e);
    }
  }

  async function assign(issue: Issue) {
    try {
      execSync(`acme assign ${issue.id} --to ${issue.assignee}`);
      new Cache().set("token", apiKey);
      posthog.capture({ distinctId: issue.assignee, event: "assign" });
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Error", message: (e as Error).message });
    }
  }

  if (selected) {
    return <Detail markdown={`# ${selected.title}\n\nLabels: ${labels?.size}`} />;
  }

  return (
    <List navigationTitle={t("search")} onSearchTextChange={setSearchText}>
      {issues.map((issue) => (
        <List.Item
          key={issue.id}
          title={issue.title}
          accessoryTitle={issue.assignee}
          icon={`https://www.google.com/s2/favicons?sz=64&domain=${issue.domain}`}
          actions={
            <ActionPanel>
              <Action title="open details" onAction={() => setSelected(issue)} />
              <Action title="Delete Issue" onAction={() => removeIssue(issue)} />
              <Action.CopyToClipboard
                title="copy url"
                content={issue.url}
                shortcut={{ macos: { modifiers: ["cmd"], key: "h" }, windows: { modifiers: ["ctrl"], key: "h" } }}
              />
              <Action
                title="Copy API Key"
                icon={Icon.Key}
                shortcut={{ modifiers: ["cmd"], key: "h" }}
                onAction={() => Clipboard.copy(apiKey)}
              />
              <Action title="Assign to Me" shortcut={{ modifiers: ["cmd"], key: "return" }} onAction={() => assign(issue)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
