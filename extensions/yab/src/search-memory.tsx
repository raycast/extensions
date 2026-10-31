import { Action, ActionPanel, Detail, Icon, List, LaunchProps } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { readFileSync } from "fs";
import { join } from "path";
import { useState } from "react";
import { file } from "./data";
import { cli } from "./yab";

type Hit = { file: string; line?: number; text?: string; modified?: string };

const KINDS: Record<string, string> = {
  people: "Person",
  companies: "Company",
  sites: "Site",
  projects: "Project",
  concepts: "Idea",
  agent: "How the agent works",
  users: "You",
  episodic: "Moment",
};

function kind(path: string): string {
  return KINDS[path.split("/")[0]] ?? "About you";
}

function title(path: string): string {
  const base = path.split("/").pop()!.replace(/\.md$/, "");
  if (base === "USER") return "You";
  if (base === "MEMORY") return "What Yab remembers";
  if (base === "TAXONOMY") return "How it's sorted";
  return base.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function MemoryFile({ path }: { path: string }) {
  let text = "";
  try {
    text = readFileSync(file(join("memory", path)), "utf8").replace(/^---[\s\S]*?---\n/, "");
  } catch {
    text = "_This note is gone._";
  }
  return (
    <Detail
      navigationTitle={title(path)}
      markdown={text}
      actions={
        <ActionPanel>
          <Action.Open title="Open the Note" target={file(join("memory", path))} />
          <Action.CopyToClipboard title="Copy" content={text} />
        </ActionPanel>
      }
    />
  );
}

export default function Command(props: LaunchProps) {
  const [text, setText] = useState(props.fallbackText ?? "");
  const { data, isLoading } = useCachedPromise(
    async (q: string) => {
      const { stdout } = await cli(
        q.trim() ? ["memory", "search", ...q.trim().split(/\s+/), "--json"] : ["memory", "list", "--json"],
      );
      try {
        return JSON.parse(stdout) as Hit[];
      } catch {
        return [];
      }
    },
    [text],
    { keepPreviousData: true },
  );
  return (
    <List
      isLoading={isLoading}
      throttle
      filtering={false}
      searchText={text}
      onSearchTextChange={setText}
      searchBarPlaceholder="Search what Yab knows…"
    >
      <List.EmptyView
        icon={Icon.Bookmark}
        title={text ? "Yab doesn't know that yet" : "Yab hasn't learned anything yet"}
      />
      {(data ?? []).map((h, i) => (
        <List.Item
          key={`${h.file}:${h.line ?? i}`}
          icon={Icon.Document}
          title={title(h.file)}
          subtitle={h.text
            ?.replace(/^---[\s\S]*?---/, "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 120)}
          accessories={[{ tag: kind(h.file) }]}
          actions={
            <ActionPanel>
              <Action.Push title="Read" icon={Icon.Eye} target={<MemoryFile path={h.file} />} />
              {h.text ? <Action.CopyToClipboard title="Copy Lines" content={h.text} /> : null}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
