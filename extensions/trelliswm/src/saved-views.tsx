import { Action, ActionPanel, Icon, Keyboard, List, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ViewNameForm } from "./components/ViewNameForm";
import { confirmAndSaveView } from "./lib/save-view";
import { runTrellisCommand } from "./lib/trellis";
import { loadViewNames, saveViewNames, VIEW_NUMBERS, ViewNames, viewTitle } from "./lib/view-names";

interface RenameViewFormProps {
  n: number;
  names: ViewNames;
  onSave: (names: ViewNames) => Promise<void>;
}

function RenameViewForm({ n, names, onSave }: RenameViewFormProps) {
  const { pop } = useNavigation();

  async function handleSubmit(name: string) {
    const next = { ...names };
    if (name) {
      next[n] = name;
    } else {
      delete next[n];
    }
    await onSave(next);
    pop();
  }

  return (
    <ViewNameForm
      n={n}
      navigationTitle={`Name View ${n}`}
      currentName={names[n]}
      submitTitle="Save Name"
      description="Leave empty to clear the name."
      onSubmit={handleSubmit}
    />
  );
}

export default function SavedViews() {
  const { data: names = {}, isLoading, mutate } = usePromise(loadViewNames);

  async function updateNames(next: ViewNames) {
    await mutate(saveViewNames(next), { optimisticUpdate: () => next });
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search saved views">
      {VIEW_NUMBERS.map((n) => (
        <List.Item
          key={n}
          icon={Icon.Eye}
          title={viewTitle(n, names)}
          subtitle={names[n] ? `View ${n}` : undefined}
          keywords={[String(n)]}
          accessories={[{ tag: `⌃⌥${n}`, tooltip: "TrellisWM shortcut" }]}
          actions={
            <ActionPanel>
              <Action title="Go to View" icon={Icon.ArrowRight} onAction={() => runTrellisCommand(`view?n=${n}`)} />
              <Action
                title="Save Current View Here"
                icon={Icon.SaveDocument}
                shortcut={Keyboard.Shortcut.Common.Save}
                onAction={() => confirmAndSaveView(n)}
              />
              <Action.Push
                title="Rename View"
                icon={Icon.Pencil}
                shortcut={Keyboard.Shortcut.Common.Edit}
                target={<RenameViewForm n={n} names={names} onSave={updateNames} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
