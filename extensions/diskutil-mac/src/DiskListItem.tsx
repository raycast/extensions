import { SizesView } from "./sizesViewUtils";

// ---------- DiskListItem ----------
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { JSX } from "react";
import Disk from "./Disk";

interface DiskListItemProps {
  disk: Disk;
  showingDetail: { show: boolean; detail: number };
  sizesView: SizesView;
  onToggleDetail: (detailType: number) => void;
  onRefresh: () => void;
  onToggleSizesView: () => void;
}

export default function DiskListItem({
  disk,
  showingDetail,
  sizesView,
  onToggleDetail,
  onRefresh,
  onToggleSizesView,
}: DiskListItemProps): JSX.Element {
  return (
    <List.Item
      title={`${disk.number}: ${disk.identifier}`}
      subtitle={disk.name}
      accessories={[disk.getType(), disk.getSizeAccessory(sizesView), disk.getMountStatusAccessory()]}
      detail={
        showingDetail.show ? (
          <List.Item.Detail metadata={showingDetail.detail === 1 ? disk.getDetailsPlist() : disk.getDetails()} />
        ) : null
      }
      keywords={[disk.name, disk.mountStatus]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={disk.identifier} />
          <Action title="Toggle Detail" icon={Icon.Sidebar} onAction={() => onToggleDetail(0)} />
          {disk.getActions(onRefresh).map((action, index) => (
            <Action
              key={index}
              title={action.title}
              icon={action.icon}
              shortcut={action.shortcut}
              onAction={action.onAction}
            />
          ))}
          <Action
            title="Refresh List"
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={onRefresh}
            icon={Icon.RotateAntiClockwise}
          />
          <Action
            title="Toggle Detail Alt"
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
            icon={Icon.Sidebar}
            onAction={() => onToggleDetail(1)}
          />
          <Action
            title="Toggle Sizes View"
            shortcut={{ modifiers: ["cmd"], key: "." }}
            icon={Icon.ArrowClockwise}
            onAction={onToggleSizesView}
          />
        </ActionPanel>
      }
    />
  );
}
