import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import AskGroup from "./ask-group";
import { ToolResult, callMindsTool, findValue, resultData } from "./mcp";

type Group = { id: string; name: string; members?: string; url?: string; raw: unknown };

function collectGroups(root: unknown): Group[] {
  const arrays: unknown[][] = [];
  const queue: unknown[] = [root];
  const seen = new Set<object>();
  while (queue.length) {
    const value = queue.shift();
    if (!value || typeof value !== "object" || seen.has(value)) continue;
    seen.add(value);
    if (Array.isArray(value)) arrays.push(value);
    for (const child of Object.values(value)) if (child && typeof child === "object") queue.push(child);
  }
  const candidates = arrays.find((items) =>
    items.some((item) => item && typeof item === "object" && findValue(item, ["groupId", "group_id", "id"])),
  );
  return (candidates ?? []).flatMap((raw) => {
    const id = findValue(raw, ["groupId", "group_id", "id"]);
    const name = findValue(raw, ["name", "groupName", "group_name"]);
    if (!id || !name) return [];
    return [
      {
        id,
        name,
        members: findValue(raw, ["memberCount", "member_count", "mindCount", "mind_count"]),
        url: findValue(raw, ["workspaceUrl", "workspace_url", "groupUrl", "group_url", "url"]),
        raw,
      },
    ];
  });
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [result, setResult] = useState<ToolResult>();
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    try {
      setResult(await callMindsTool("list_groups", {}));
    } catch (error) {
      await showToast(
        Toast.Style.Failure,
        "Could not load Groups",
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const groups = useMemo(() => collectGroups(result ? resultData(result) : undefined), [result]);
  const filtered = groups.filter((group) => group.name.toLowerCase().includes(searchText.toLowerCase()));

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search Groups..." throttle>
      <List.EmptyView
        icon={Icon.TwoPeople}
        title={groups.length ? "No Matching Groups" : "No Groups Found"}
        description={groups.length ? "Try another search." : "Create or share a Group in Minds, then refresh."}
        actions={
          <ActionPanel>
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={load} />
            <Action.OpenInBrowser title="Open Minds" url="https://getminds.ai/dashboard" />
          </ActionPanel>
        }
      />
      {filtered.map((group) => (
        <List.Item
          key={group.id}
          icon={{ source: Icon.TwoPeople, tintColor: Color.Yellow }}
          title={group.name}
          subtitle={group.id}
          accessories={group.members ? [{ text: `${group.members} Minds` }] : []}
          actions={
            <ActionPanel>
              <Action.Push title="Ask This Group" icon={Icon.Message} target={<AskGroup group={group} />} />
              {group.url?.startsWith("https://") ? (
                <Action.OpenInBrowser title="Open Group in Minds" url={group.url} />
              ) : null}
              <Action.CopyToClipboard title="Copy Group ID" content={group.id} />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={load} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
