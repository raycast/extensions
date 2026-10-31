import { Action, ActionPanel, Application, getApplications, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise, useSQL } from "@raycast/utils";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { useState } from "react";
import { searchSQL } from "./sql";

const DB = join(homedir(), "Library/Application Support/Holt/holt.db");

type Clip = {
  id: number;
  kind: number;
  text: string;
  source_app: string | null;
  created_at: number;
  pinned: number;
  device: string | null;
};

export default function Command() {
  if (!existsSync(DB)) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Clipboard}
          title="Holt isn't installed"
          description="Install Holt and copy something to see it here."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Get Holt" url="https://holt.snowztech.com" />
            </ActionPanel>
          }
        />
      </List>
    );
  }
  return <Clips />;
}

function Clips() {
  const [query, setQuery] = useState("");
  const { data, isLoading, permissionView } = useSQL<Clip>(DB, searchSQL(query));
  const { data: apps } = useCachedPromise(getApplications);

  if (permissionView) return permissionView;

  return (
    <List isLoading={isLoading} onSearchTextChange={setQuery} filtering={false} throttle isShowingDetail>
      {data?.map((clip) => {
        const app = apps?.find((a) => a.bundleId === clip.source_app);
        return (
          <List.Item
            key={clip.id}
            icon={app ? { fileIcon: app.path } : clip.kind === 1 ? Icon.Link : Icon.Text}
            title={clip.text.trim().split("\n")[0]}
            accessories={clip.pinned ? [{ icon: Icon.Pin }] : []}
            detail={<Detail clip={clip} app={app} />}
            actions={
              <ActionPanel>
                <Action.Paste content={clip.text} />
                <Action.CopyToClipboard content={clip.text} />
                {clip.kind === 1 && (
                  <Action.OpenInBrowser url={clip.text.trim()} shortcut={Keyboard.Shortcut.Common.Open} />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function Detail({ clip, app }: { clip: Clip; app?: Application }) {
  return (
    <List.Item.Detail
      markdown={fenced(clip.text)}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Copied" text={new Date(clip.created_at).toLocaleString()} />
          {app && <List.Item.Detail.Metadata.Label title="App" text={app.name} />}
          {clip.device && <List.Item.Detail.Metadata.Label title="Device" text={clip.device} />}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

// A fence longer than any backtick run in the clip, so the clip can't close it early.
function fenced(text: string) {
  const longest = Math.max(2, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(longest + 1);
  return `${fence}\n${text}\n${fence}`;
}
