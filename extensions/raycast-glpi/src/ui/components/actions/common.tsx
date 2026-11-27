import * as React from "react";
import { Action, Icon, Keyboard } from "@raycast/api";

interface ActionRefreshProps {
  onAction: () => void;
}

export function ActionRefresh({ onAction }: ActionRefreshProps): React.JSX.Element {
  return <Action title="Refresh" icon={Icon.Repeat} shortcut={Keyboard.Shortcut.Common.Refresh} onAction={onAction} />;
}

interface ActionToggleDetailProps {
  showDetail: boolean;
  setShowDetail: React.Dispatch<React.SetStateAction<boolean>>;
}

export function ActionToggleDetail({ showDetail, setShowDetail }: ActionToggleDetailProps): React.JSX.Element {
  return (
    <Action
      autoFocus={true}
      shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
      title={showDetail ? "Hide Detail" : "Show Detail"}
      icon={showDetail ? Icon.EyeDisabled : Icon.Eye}
      onAction={() => setShowDetail((v) => !v)}
    />
  );
}
