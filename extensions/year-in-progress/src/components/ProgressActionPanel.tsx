import { Action, ActionPanel, Icon } from "@raycast/api";
import { Progress } from "../types";

type ProgressActionPanelProps = {
  progress: Progress;
  onShowDetails?: any;
  onChangeShowFromMenuBar?: any;
  onEditProgress?: any;
  onAddProgress?: any;
  onDeteleProgress?: any;
  onPinProgress?: any;
};

export default function ProgressActionPanel(props: ProgressActionPanelProps) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          title="Show Details"
          icon={Icon.AppWindowSidebarLeft}
          onAction={() => {
            props.onShowDetails?.();
          }}
        />
        <Action
          title={props.progress.pinned ? "Unpin it" : "Pin it"}
          icon={Icon.Pin}
          onAction={() => {
            props.onPinProgress?.(props.progress);
          }}
        />
        <Action
          title={`${props.progress.showInMenuBar ? "Hide" : "Show"} From Menu Bar`}
          icon={props.progress.showInMenuBar ? Icon.EyeDisabled : Icon.Eye}
          onAction={() => {
            props.onChangeShowFromMenuBar?.();
          }}
        />
        <Action
          title="Edit Progress"
          icon={Icon.Pencil}
          onAction={() => {
            props.onEditProgress?.(props.progress);
          }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Add New Progress"
          icon={Icon.Plus}
          onAction={() => {
            props.onAddProgress?.();
          }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Delete Progress"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={() => {
            props.onDeteleProgress?.(props.progress.title);
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
