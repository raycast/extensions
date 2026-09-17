/**
 * Fatal-error empty state shared by batch run screens.
 *
 * @module components/run-failed-view
 */

import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { MODERN_COLORS } from "../constants";

/** Props for {@link RunFailedView}. */
type RunFailedViewProps = {
  readonly navigationTitle: string;
  readonly description: string;
  readonly onDismiss: () => void;
};

/**
 * Renders a full-screen error state when a batch run throws before producing a result.
 *
 * Shared by {@link CleanupRunView} and {@link MergeRunView}.
 *
 * @param props - Navigation title, error description, and dismiss handler.
 * @returns Raycast `List` with a single `EmptyView`.
 */
export function RunFailedView({ navigationTitle, description, onDismiss }: RunFailedViewProps) {
  return (
    <List navigationTitle={navigationTitle} isShowingDetail>
      <List.EmptyView
        title={navigationTitle}
        description={description}
        icon={{ source: Icon.XMarkCircle, tintColor: MODERN_COLORS.error }}
        actions={
          <ActionPanel>
            <Action title="Go Back" icon={Icon.ArrowLeft} onAction={onDismiss} />
          </ActionPanel>
        }
      />
    </List>
  );
}
