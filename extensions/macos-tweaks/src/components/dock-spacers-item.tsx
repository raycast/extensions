import { Action, ActionPanel, Alert, Clipboard, Color, Icon, List, confirmAlert, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  DOCK_DOMAIN,
  SIDE_KEYS,
  addDockSpacer,
  countDockSpacers,
  getSpacerCommandString,
  removeDockSpacers,
} from "../utils/dock-spacers";
import type { DockSide, SpacerSize } from "../utils/dock-spacers";

/**
 * Spacers are tiles added to the Dock, not a setting with a value: there is no default to compare
 * against or reset to, so they cannot be a tweak in the catalog. This item sits with the Dock
 * tweaks instead and shows how many the Dock holds.
 */
export function DockSpacersItem() {
  const { data: count, revalidate } = useCachedPromise(countDockSpacers, [], { initialData: 0 });

  const statusIcon =
    count > 0
      ? { source: Icon.CircleFilled, tintColor: Color.Orange }
      : { source: Icon.Circle, tintColor: Color.SecondaryText };

  return (
    <List.Item
      title="Dock Spacers"
      icon={statusIcon}
      keywords={[DOCK_DOMAIN, ...Object.values(SIDE_KEYS), "spacer", "space", "gap", "group", "divider", "separator"]}
      accessories={[{ text: count > 0 ? `${count} in Dock` : "None" }]}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Description"
                text="Empty tiles that split the Dock into groups. A new one goes in at the end of its side: drag it into place, and drag it out of the Dock to remove it"
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.TagList title="Status">
                <List.Item.Detail.Metadata.TagList.Item
                  text={count > 0 ? `${count} in Dock` : "None"}
                  color={count > 0 ? Color.Orange : Color.SecondaryText}
                />
                <List.Item.Detail.Metadata.TagList.Item text="Safe" color={Color.Green} />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Category" text="Dock" />
              <List.Item.Detail.Metadata.Label title="Domain" text={DOCK_DOMAIN} />
              <List.Item.Detail.Metadata.Label title="Keys" text={Object.values(SIDE_KEYS).join(", ")} />
              <List.Item.Detail.Metadata.Label title="Restarts" text="Dock" />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Command" text={getSpacerCommandString("small", "apps")} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <AddSpacerAction title="Add Small Spacer" size="small" side="apps" onUpdate={revalidate} />
            <AddSpacerAction title="Add Regular Spacer" size="regular" side="apps" onUpdate={revalidate} />
            <ActionPanel.Submenu title="Add to Documents Side" icon={Icon.Folder}>
              <AddSpacerAction title="Small Spacer" size="small" side="documents" onUpdate={revalidate} />
              <AddSpacerAction title="Regular Spacer" size="regular" side="documents" onUpdate={revalidate} />
            </ActionPanel.Submenu>
          </ActionPanel.Section>
          <ActionPanel.Section>
            {count > 0 && <RemoveSpacersAction count={count} onUpdate={revalidate} />}
            <Action
              title="Copy Defaults Command"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={async () => {
                const cmd = getSpacerCommandString("small", "apps");
                await Clipboard.copy(cmd);
                await showToast({ title: "Copied", message: cmd });
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function AddSpacerAction({
  title,
  size,
  side,
  onUpdate,
}: {
  title: string;
  size: SpacerSize;
  side: DockSide;
  onUpdate: () => void;
}) {
  return (
    <Action
      title={title}
      icon={Icon.Plus}
      onAction={async () => {
        try {
          addDockSpacer(size, side);
          await showToast({
            style: Toast.Style.Success,
            title: `${size === "small" ? "Small spacer" : "Spacer"} added`,
            message: "Drag it into place in the Dock",
          });
          onUpdate();
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to add the spacer",
            message: error instanceof Error ? error.message : undefined,
          });
        }
      }}
    />
  );
}

function RemoveSpacersAction({ count, onUpdate }: { count: number; onUpdate: () => void }) {
  return (
    <Action
      title="Remove All Spacers"
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={async () => {
        const confirmed = await confirmAlert({
          title: `Remove ${count === 1 ? "the spacer" : `all ${count} spacers`}?`,
          message: "Your apps and folders stay where they are. Dock will be restarted.",
          primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
        });
        if (!confirmed) return;

        try {
          const removed = await removeDockSpacers();
          await showToast({
            style: Toast.Style.Success,
            title: `Removed ${removed} ${removed === 1 ? "spacer" : "spacers"}`,
          });
          onUpdate();
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to remove the spacers",
            message: error instanceof Error ? error.message : undefined,
          });
        }
      }}
    />
  );
}
