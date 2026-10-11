import { Action } from "@raycast/api";
import { nextSearchType, SEARCH_TYPES, type SearchType } from "../lib/searchTypes";
import { crossPlatformShortcut } from "../lib/shortcuts";

const CYCLE_SHORTCUT = crossPlatformShortcut(["cmd"], "t");

interface SwitchTypeActionProps {
  current: SearchType;
  onSwitch: (type: SearchType) => void;
}

export function SwitchTypeAction({ current, onSwitch }: SwitchTypeActionProps) {
  const next = nextSearchType(current);
  return (
    <Action
      title={`Switch to ${SEARCH_TYPES[next].title}`}
      icon={SEARCH_TYPES[next].icon}
      shortcut={CYCLE_SHORTCUT}
      onAction={() => onSwitch(next)}
    />
  );
}
