import { runAppleScript } from "@raycast/utils";

import type { StoredSource } from "./domain/source-catalog";
import type { DockScan } from "./domain/unread-count";
import { classifyDockError, deserializeDockOutcomes } from "./dock-scan-protocol";

export async function scanDock(sources: readonly StoredSource[], timeout?: number): Promise<DockScan> {
  try {
    const dockNames = sources.map((source) => source.dockName);
    const output = await runAppleScript<string>(dockScanScript(), dockNames, timeout ? { timeout } : undefined);
    const outcomes = deserializeDockOutcomes(output, sources);
    return outcomes ? { kind: "success", outcomes } : { kind: "failed" };
  } catch (error) {
    return classifyDockError(error);
  }
}

export function dockScanScript(): string {
  return `
on run sourceNames
  set output to ""
  tell application "System Events"
    tell process "Dock"
      repeat with sourceName in sourceNames
        set sourceId to contents of sourceName
        if exists UI element sourceId of list 1 then
          try
            set badgeValue to value of attribute "AXStatusLabel" of UI element sourceId of list 1
            if badgeValue is missing value then set badgeValue to ""
            set output to output & sourceId & tab & "badge" & tab & badgeValue & linefeed
          on error
            set output to output & sourceId & tab & "couldNotReadBadge" & tab & linefeed
          end try
        else
          set output to output & sourceId & tab & "notAvailable" & tab & linefeed
        end if
      end repeat
    end tell
  end tell
  return output
end run`;
}
