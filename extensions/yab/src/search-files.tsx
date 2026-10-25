import { Action, ActionPanel, Detail, Icon, List, Keyboard } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { existsSync } from "fs";
import { useState } from "react";
import { fileHits } from "./parse";
import { callTool } from "./yab";

export default function Command() {
  const [text, setText] = useState("");
  const [from, setFrom] = useState("all");
  const { data, isLoading, error } = useCachedPromise(
    async (q: string, f: string) =>
      fileHits(
        await callTool("files_search", {
          ...(q.trim() ? { query: q.trim() } : {}),
          ...(f !== "all" ? { from: f } : {}),
          limit: 50,
        }),
      ),
    [text, from],
    { keepPreviousData: true },
  );
  return (
    <List
      isLoading={isLoading}
      throttle
      filtering={false}
      onSearchTextChange={setText}
      searchBarPlaceholder="Search names, senders, sites and the words inside…"
      searchBarAccessory={
        <List.Dropdown tooltip="From" storeValue onChange={setFrom}>
          <List.Dropdown.Item title="Everywhere" value="all" />
          <List.Dropdown.Item title="Downloaded" value="downloaded" />
          <List.Dropdown.Item title="From Mail" value="mail" />
          <List.Dropdown.Item title="Sent" value="sent" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Document}
        title={error ? "Yab isn't reachable" : "No files found"}
        description={error?.message}
      />
      {(data ?? []).map((f) => {
        const here = f.path && existsSync(f.path) ? f.path : undefined;
        return (
          <List.Item
            key={f.id || f.name}
            icon={here ? { fileIcon: here } : Icon.Document}
            title={f.name}
            subtitle={f.about}
            quickLook={here ? { path: here, name: f.name } : undefined}
            actions={
              <ActionPanel>
                {here ? <Action.Open title="Open" target={here} /> : null}
                {here ? <Action.ShowInFinder path={here} /> : null}
                {here ? <Action.ToggleQuickLook shortcut={Keyboard.Shortcut.Common.ToggleQuickLook} /> : null}
                {here ? (
                  <Action.CopyToClipboard
                    title="Copy File"
                    content={{ file: here }}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                ) : null}
                <Action.Push
                  title="Read the Words Inside"
                  icon={Icon.Text}
                  target={<FileWords id={f.id || f.path || f.name} name={f.name} />}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function FileWords({ id, name }: { id: string; name: string }) {
  const { data, isLoading } = usePromise((i: string) => callTool("files_read", { id: i }), [id]);
  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={name}
      markdown={data ? "```\n" + data.slice(0, 20000) + "\n```" : ""}
    />
  );
}
