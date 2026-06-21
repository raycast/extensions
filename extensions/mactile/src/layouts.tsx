import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  launchCommand,
  LaunchType,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { LayoutForm } from "./components/LayoutForm";
import { getPlacementTitle } from "./placements";
import { deleteLayout, getLayouts } from "./storage";
import { LayoutPreset } from "./types";
import { runLayout } from "./run-layout";

export default function Command() {
  const [layouts, setLayouts] = useState<LayoutPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();
  const builtInLayouts = layouts.filter((layout) => layout.isBuiltIn);
  const customLayouts = layouts.filter((layout) => !layout.isBuiltIn);

  async function loadLayouts() {
    setIsLoading(true);
    setLayouts(await getLayouts());
    setIsLoading(false);
  }

  useEffect(() => {
    void loadLayouts();
  }, []);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search saved layouts..."
      navigationTitle="Manage Window Layouts"
      actions={
        <ActionPanel>
          <Action
            title="Create Window Layout"
            icon={Icon.Plus}
            onAction={() => launchCommand({ name: "index", type: LaunchType.UserInitiated })}
          />
        </ActionPanel>
      }
    >
      <List.EmptyView
        icon={Icon.Window}
        title="No Layouts Yet"
        description="Create a layout with a name, size, and placement."
        actions={
          <ActionPanel>
            <Action
              title="Create Window Layout"
              icon={Icon.Plus}
              onAction={() => launchCommand({ name: "index", type: LaunchType.UserInitiated })}
            />
          </ActionPanel>
        }
      />
      <List.Section title="Searchable Presets">
        {builtInLayouts.map((layout) => (
          <LayoutListItem key={layout.id} layout={layout} onEdit={editLayout} onDuplicate={duplicateLayout} />
        ))}
      </List.Section>
      {customLayouts.length > 0 ? (
        <List.Section title="Custom Layouts">
          {customLayouts.map((layout) => (
            <LayoutListItem
              key={layout.id}
              layout={layout}
              onEdit={editLayout}
              onDuplicate={duplicateLayout}
              onDelete={removeLayout}
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );

  function editLayout(layout: LayoutPreset) {
    push(<LayoutForm layout={layout} onSave={loadLayouts} />);
  }

  function duplicateLayout(layout: LayoutPreset) {
    push(
      <LayoutForm
        layout={{
          ...layout,
          id: "",
          name: `${layout.name} Copy`,
          commandName: undefined,
          isBuiltIn: false,
          isDisabledByDefault: false,
          createdAt: "",
          updatedAt: "",
        }}
        onSave={loadLayouts}
        returnToListAfterSave
      />,
    );
  }

  async function removeLayout(layout: LayoutPreset) {
    if (layout.isBuiltIn) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Preset Cannot Be Deleted",
        message: "Edit or duplicate built-in presets instead.",
      });
      return;
    }

    const confirmed = await confirmAlert({
      title: `Delete ${layout.name}?`,
      message: "This layout will be removed from MacTile.",
      primaryAction: {
        title: "Delete Layout",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    await deleteLayout(layout.id);
    await loadLayouts();
    await showToast({ style: Toast.Style.Success, title: "Layout Deleted", message: layout.name });
  }
}

type LayoutListItemProps = {
  layout: LayoutPreset;
  onEdit: (layout: LayoutPreset) => void;
  onDuplicate: (layout: LayoutPreset) => void;
  onDelete?: (layout: LayoutPreset) => void;
};

function LayoutListItem({ layout, onEdit, onDuplicate, onDelete }: LayoutListItemProps) {
  return (
    <List.Item
      key={layout.id}
      icon={Icon.Window}
      title={layout.name}
      subtitle={`${layout.widthPercentage}% x ${layout.heightPercentage}%`}
      accessories={[{ text: getPlacementTitle(layout.placement) }]}
      actions={
        <ActionPanel>
          <Action title="Apply Window Layout" icon={Icon.Window} onAction={() => runLayout(layout.id)} />
          <Action
            title="Edit Window Layout"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            onAction={() => onEdit(layout)}
          />
          <Action
            title="Duplicate Layout"
            icon={Icon.CopyClipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            onAction={() => onDuplicate(layout)}
          />
          {layout.commandName ? (
            <Action.CopyToClipboard
              title="Copy Deeplink"
              content={getLayoutDeeplink(layout.commandName)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          ) : null}
          {onDelete ? (
            <Action
              title="Delete Layout"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={() => onDelete(layout)}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

function getLayoutDeeplink(commandName: string) {
  return `raycast://extensions/nikgraphx/mactile/${commandName}`;
}
