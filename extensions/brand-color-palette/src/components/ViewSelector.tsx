import { Grid, Icon, Color, ActionPanel, Action } from "@raycast/api";
import { ColorForm } from "./ColorForm";
import { ViewSelectorProps } from "../types/index";

export function ViewSelector({ selectedView, onViewChange, onSave }: ViewSelectorProps) {
  return (
    <Grid.Section title="Libraries" subtitle="Select library" inset={Grid.Inset.Large} columns={8}>
      <Grid.Item
        content={Icon.Brush}
        accessory={{
          icon: {
            source: selectedView === "primitives" ? Icon.CircleFilled : Icon.Circle,
            tintColor: selectedView === "primitives" ? Color.Purple : Color.SecondaryText,
          },
        }}
        title="Primitives"
        actions={
          <ActionPanel>
            <Action title="Show Primitives" onAction={() => onViewChange("primitives")} />
            <Action.Push
              icon={Icon.Plus}
              title="Add Color"
              target={<ColorForm onSave={onSave} currentView={selectedView} />}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          </ActionPanel>
        }
      />
      <Grid.Item
        content={Icon.Book}
        accessory={{
          icon: {
            source: selectedView === "tokens" ? Icon.CircleFilled : Icon.Circle,
            tintColor: selectedView === "tokens" ? Color.Purple : Color.SecondaryText,
          },
        }}
        title="Tokens"
        actions={
          <ActionPanel>
            <Action title="Show Tokens" onAction={() => onViewChange("tokens")} />
            <Action.Push
              icon={Icon.Plus}
              title="Add Color"
              target={<ColorForm onSave={onSave} currentView={selectedView} />}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          </ActionPanel>
        }
      />
    </Grid.Section>
  );
}
