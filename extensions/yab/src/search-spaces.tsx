import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { attempt, AutomationEmptyView, isAutomationDenied, spaceColor, spaceIcon, useYabWindow } from "./components";
import { focusSpace, newTab, newWindow } from "./yab";

function counts(pins: number, kept: number, today: number): string {
  const parts = [
    pins ? `${pins} ${pins === 1 ? "pin" : "pins"}` : "",
    kept ? `${kept} kept` : "",
    today ? `${today} today` : "",
  ].filter(Boolean);
  return parts.join(" · ") || "Empty";
}

export default function Command() {
  const { data, isLoading, error } = useYabWindow();
  if (error && isAutomationDenied(error)) {
    return (
      <List>
        <AutomationEmptyView />
      </List>
    );
  }
  const spaces = data?.spaces ?? [];
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search spaces…">
      {spaces.map((space, index) => (
        <List.Item
          key={space.id}
          icon={spaceIcon(space)}
          title={space.title}
          accessories={[
            ...(space.active ? [{ tag: { value: "On Screen", color: Color.Blue } }] : []),
            { text: counts(space.pins, space.kept, space.today) },
            ...(index < 9
              ? [{ tag: { value: `⌃${index + 1}`, color: spaceColor(space.color) ?? Color.SecondaryText } }]
              : []),
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Go to Space"
                icon={Icon.ArrowRight}
                onAction={() => attempt("Couldn't go there", () => focusSpace(space.id))}
              />
              <Action
                title="New Tab in Space"
                icon={Icon.Plus}
                shortcut={Keyboard.Shortcut.Common.New}
                onAction={() => attempt("Couldn't open a tab", () => newTab("", space.id))}
              />
              <Action
                title="New Window in Space"
                icon={Icon.Window}
                shortcut={Keyboard.Shortcut.Common.New}
                onAction={() => attempt("Couldn't open a window", () => newWindow({ spaceId: space.id }))}
              />
              <Action.CopyToClipboard
                title="Copy Space Name"
                content={space.title}
                shortcut={Keyboard.Shortcut.Common.CopyName}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
