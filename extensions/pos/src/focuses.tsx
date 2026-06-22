import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { runPosJSON, type Focus } from "./lib/pos";
import { confirmAndLoad, toastRun } from "./lib/actions";
import { ProjectList } from "./components/ProjectList";

export default function Focuses() {
  const { isLoading, data } = usePromise(() => runPosJSON<Focus[]>([]));

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter focuses…">
      {(data ?? []).map((f) => (
        <List.Item
          key={f.name}
          title={`${f.emoji} ${f.name}`}
          subtitle={f.tier}
          actions={
            <ActionPanel>
              <Action.Push
                title="Browse Projects"
                icon={Icon.List}
                target={<ProjectList focus={f.name} />}
              />
              <Action
                title="Open Claude Code"
                icon={Icon.Code}
                onAction={() =>
                  toastRun(["cc", f.name], `Opened Claude Code for ${f.name}`)
                }
              />
              <Action
                title={`Load Focus “${f.name}”`}
                icon={Icon.AppWindowGrid2x2}
                style={Action.Style.Destructive}
                onAction={() => confirmAndLoad(f.name)}
              />
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView
        title="No focuses"
        description="Is pos installed and the manifest present?"
      />
    </List>
  );
}
