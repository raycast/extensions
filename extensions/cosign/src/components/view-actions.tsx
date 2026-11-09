import type { ReactNode } from "react";
import { Action, ActionPanel, Icon } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { listDetailMetadata, type MetaItem } from "../lib/meta";

/**
 * A list's sidebar and description settings, plus its "View" action section. `detailKey` is the list's own
 * show-sidebar setting; the description setting is shared by every list, so one choice applies everywhere.
 */
export function useDetailPane(detailKey: string) {
  const [showDetail, setShowDetail] = useCachedState(detailKey, true);
  const [descriptionOnly, setDescriptionOnly] = useCachedState("description-only", false);
  const viewSection = (
    <ActionPanel.Section title="View">
      <Action
        title={showDetail ? "Hide Sidebar" : "Show Sidebar"}
        icon={Icon.AppWindowSidebarRight}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "d" },
          Windows: { modifiers: ["ctrl", "shift"], key: "d" },
        }}
        onAction={() => setShowDetail((v) => !v)}
      />
      <Action
        title={descriptionOnly ? "Hide Description" : "Show Description"}
        icon={Icon.AlignLeft}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "y" },
          Windows: { modifiers: ["ctrl", "shift"], key: "y" },
        }}
        onAction={() => setDescriptionOnly((v) => !v)}
      />
    </ActionPanel.Section>
  );
  // Description mode hands the whole pane to the markdown by dropping the metadata.
  const metadata = (items: MetaItem[]): ReactNode => (descriptionOnly ? undefined : listDetailMetadata(items));
  return { showDetail, viewSection, metadata };
}
