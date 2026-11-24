import { Action, ActionPanel, List } from "@raycast/api";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { run } from "./run";

/// Written by Quite Handy while it runs: every pointer with its picture.
const statePath = join(homedir(), "Library/Application Support/QuiteHandy/state.json");

type Pointer = { id: string; name: string; image?: string; imageDark?: string; type: string };

function pointers(): Pointer[] | undefined {
  if (!existsSync(statePath)) {
    return undefined;
  }
  try {
    return (JSON.parse(readFileSync(statePath, "utf8")) as { pointers: Pointer[] }).pointers;
  } catch {
    return undefined;
  }
}

export default function Command() {
  const list = pointers();
  if (!list) {
    return (
      <List>
        <List.EmptyView
          title="Quite Handy is not running"
          description="Start Quite Handy, then open this command again"
          actions={
            <ActionPanel>
              <Action title="Start Quite Handy" onAction={() => run("")} />
            </ActionPanel>
          }
        />
      </List>
    );
  }
  return (
    <List searchBarPlaceholder="Search pointers">
      {list.map((p) => (
        <List.Item
          key={p.id}
          title={p.name}
          keywords={[p.id]}
          icon={p.image ? { source: { light: p.image, dark: p.imageDark ?? p.image } } : undefined}
          accessories={p.type === "custom" ? [{ text: "Your own" }] : []}
          actions={
            <ActionPanel>
              <Action title="Scribble with This Pointer" onAction={() => run(`pointer/${p.id}`)} />
              <Action.CreateQuicklink
                title="Create Quicklink"
                quicklink={{ name: p.name, link: `quitehandy://pointer/${p.id}` }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
