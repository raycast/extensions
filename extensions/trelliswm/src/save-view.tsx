import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ViewNameForm } from "./components/ViewNameForm";
import { confirmAndSaveView } from "./lib/save-view";
import { loadViewNames, VIEW_NUMBERS, viewTitle } from "./lib/view-names";

export default function SaveView() {
  const { data: names = {}, isLoading } = usePromise(loadViewNames);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Choose a view to save to">
      {VIEW_NUMBERS.map((n) => (
        <List.Item
          key={n}
          icon={Icon.SaveDocument}
          title={viewTitle(n, names)}
          subtitle={names[n] ? `View ${n}` : undefined}
          keywords={[String(n)]}
          actions={
            <ActionPanel>
              <Action title="Save to View" icon={Icon.SaveDocument} onAction={() => confirmAndSaveView(n)} />
              <Action.Push
                title="Save with New Name"
                icon={Icon.Pencil}
                shortcut={Keyboard.Shortcut.Common.Edit}
                target={
                  <ViewNameForm
                    n={n}
                    navigationTitle={`Save View ${n}`}
                    currentName={names[n]}
                    submitTitle="Save View"
                    description="Leave empty to keep the current name."
                    onSubmit={async (name) => {
                      await confirmAndSaveView(n, name);
                    }}
                  />
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
