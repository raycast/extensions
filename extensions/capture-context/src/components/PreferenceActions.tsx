import { Action } from "@raycast/api";

interface PreferenceActionsProps {
  onRefresh?: () => void;
}

export function PreferenceActions({ onRefresh }: PreferenceActionsProps) {
  return (
    <>
      <Action.OpenInBrowser
        title="Change Screenshots Directory"
        icon="🖼️"
        url="raycast://preferences/extensions/capture?preferences=screenshotsDirectory"
        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
        onOpen={onRefresh}
      />
      <Action.OpenInBrowser
        title="Change Capture Directory"
        icon="📁"
        url="raycast://preferences/extensions/capture?preferences=captureDirectory"
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        onOpen={onRefresh}
      />
      {onRefresh && (
        <Action title="Refresh" icon="↻" onAction={onRefresh} shortcut={{ modifiers: ["cmd"], key: "r" }} />
      )}
    </>
  );
}
