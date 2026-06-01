import { Action, Icon, Color } from "@raycast/api";
import { cache } from "../helpers";

interface ToggleCollapseActionProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

export function ToggleCollapseAction({ isCollapsed, setIsCollapsed }: ToggleCollapseActionProps) {
  return (
    <Action
      title={isCollapsed ? "Expand All" : "Collapse Groups"}
      icon={{ source: isCollapsed ? Icon.List : Icon.List, tintColor: Color.Orange }}
      shortcut={{ modifiers: ["shift"], key: "a" }}
      onAction={() => {
        const next = !isCollapsed;
        setIsCollapsed(next);
        cache.set("browser_bridge_collapsed", String(next));
      }}
    />
  );
}
