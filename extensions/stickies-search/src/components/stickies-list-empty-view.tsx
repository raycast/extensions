import { Action, ActionPanel, Icon, List, openCommandPreferences, openExtensionPreferences } from "@raycast/api";
import { StickiesNote, showStickies } from "../utils/stickies-utils";
import { MutatePromise } from "@raycast/utils";

export function StickiesListEmptyView(props: {
  mutate: MutatePromise<StickiesNote[] | undefined, StickiesNote[] | undefined>;
  isLoading?: boolean;
  error?: Error | unknown | null;
}) {
  const { mutate, isLoading, error } = props;

  if (error != null) {
    const message = error instanceof Error ? error.message : String(error);
    return (
      <List.EmptyView
        title="Could Not Load Stickies"
        description={message}
        icon={Icon.ExclamationMark}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action
                title="Try Again"
                icon={Icon.Repeat}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={mutate}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title={"Configure Extension"}
                shortcut={{ modifiers: ["opt", "cmd"], key: "," }}
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  const title = isLoading ? "Loading Stickies…" : "No Stickies";

  return (
    <List.EmptyView
      title={title}
      icon={Icon.QuoteBlock}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title={"Refresh Stickies"}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              icon={Icon.Repeat}
              onAction={mutate}
            />
            <Action
              title={"Show Stickies Window"}
              icon={Icon.AppWindowList}
              shortcut={{ modifiers: ["shift", "cmd"], key: "s" }}
              onAction={async () => {
                await showStickies();
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={"Configure Command"}
              shortcut={{ modifiers: ["shift", "cmd"], key: "," }}
              icon={Icon.Gear}
              onAction={openCommandPreferences}
            />
            <Action
              title={"Configure Extension"}
              shortcut={{ modifiers: ["opt", "cmd"], key: "," }}
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
