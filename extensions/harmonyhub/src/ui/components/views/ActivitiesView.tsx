/**
 * View component for displaying and managing Harmony activities.
 * Shows activities grouped by type with status indicators and actions.
 * @module
 */

import { List, Icon, Action, ActionPanel } from "@raycast/api";
import { memo, useMemo } from "react";

import { useHarmony } from "../../../hooks/useHarmony";
import { HarmonyActivity } from "../../../types/core/harmony";

/**
 * Props for the ActivitiesView component
 * @interface ActivitiesViewProps
 */
interface ActivitiesViewProps {
  /** Callback when an activity is selected */
  onActivitySelect: (activity: HarmonyActivity) => void;
  /** Optional callback to go back */
  onBack?: () => void;
}

/**
 * Component for displaying and managing Harmony activities.
 * Groups activities by type and shows their current status.
 * Provides actions for starting/stopping activities.
 * @param props - Component props
 * @returns JSX element
 */
function ActivitiesViewImpl({ onActivitySelect, onBack }: ActivitiesViewProps): JSX.Element {
  const { activities, refresh, clearCache } = useHarmony();

  // Memoize activity grouping
  const { activityTypes, activitiesByType } = useMemo(() => {
    const types = new Set<string>();
    const byType = new Map<string, HarmonyActivity[]>();

    activities.forEach((activity) => {
      types.add(activity.type);
      const typeActivities = byType.get(activity.type) || [];
      typeActivities.push(activity);
      byType.set(activity.type, typeActivities);
    });

    return {
      activityTypes: Array.from(types).sort(),
      activitiesByType: byType,
    };
  }, [activities]);

  // Memoize activity list items
  const renderActivityItem = useMemo(
    () => (activity: HarmonyActivity) => (
      <List.Item
        key={activity.id}
        title={activity.name}
        subtitle={activity.type}
        icon={activity.isCurrent ? Icon.Play : Icon.Stop}
        accessories={[
          {
            icon: activity.isCurrent ? Icon.CircleFilled : Icon.Circle,
            tooltip: activity.isCurrent ? "Running" : "Stopped",
          },
        ]}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action title="Select Activity" icon={Icon.ArrowRight} onAction={() => onActivitySelect(activity)} />
            </ActionPanel.Section>
            <ActionPanel.Section>
              {refresh && <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />}
              {clearCache && <Action title="Clear Cache" icon={Icon.Trash} onAction={clearCache} />}
              {onBack && <Action title="Back" icon={Icon.ArrowLeft} onAction={onBack} />}
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    ),
    [onActivitySelect, refresh, clearCache, onBack],
  );

  return (
    <List
      navigationTitle="Activities"
      searchBarPlaceholder="Search activities..."
      isLoading={false}
      isShowingDetail={false}
    >
      {activityTypes.map((type) => {
        const typeActivities = activitiesByType.get(type) || [];
        return (
          <List.Section key={type} title={type}>
            {typeActivities.map(renderActivityItem)}
          </List.Section>
        );
      })}
    </List>
  );
}

export const ActivitiesView = memo(ActivitiesViewImpl);
