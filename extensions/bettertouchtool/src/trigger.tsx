import { Action, ActionPanel, getPreferenceValues, Icon, Keyboard, List, openExtensionPreferences } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { showFailureToast } from "@raycast/utils";
import { NamedTrigger } from "./types";
import { useNamedTriggers } from "./hooks";
import { NamedTriggerListItem } from "./components/NamedTriggerListItem";

export default function Command() {
  const [showAllTriggers, setShowAllTriggers] = useState(true);
  const { data, isLoading, error, refresh } = useNamedTriggers(showAllTriggers);

  useEffect(() => {
    if (error) {
      void showFailureToast(error, {
        title: "Unable to Load Named Triggers",
        primaryAction: {
          title: "View Preferences",
          onAction: () => openExtensionPreferences(),
        },
      });
    }
  }, [error]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search named triggers..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Determine if disabled triggers should be shown"
          onChange={(newValue) => setShowAllTriggers(newValue === "true")}
        >
          <List.Dropdown.Item key="true" title={"All Triggers"} value={"true"} icon={Icon.Eye} />
          <List.Dropdown.Item key="false" title={"Hide Disabled"} value={""} icon={Icon.EyeDisabled} />
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              onAction={refresh}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              icon={Icon.RotateClockwise}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {data?.namedTriggers && <TriggerSections namedTriggers={data.namedTriggers} visitItem={data.visitItem} />}
    </List>
  );
}

function TriggerSections({
  namedTriggers,
  visitItem,
}: {
  namedTriggers: NamedTrigger[];
  visitItem: (item: NamedTrigger) => Promise<void>;
}) {
  const { bttNamedTriggerMostUsedCount: mostUsedPref, bttNamedTriggerDefaultAction: defaultAction } =
    getPreferenceValues<Preferences.Trigger>();
  const defaultGroupName = "Default";
  const mostUsedCount = mostUsedPref === "none" ? 0 : Number.parseInt(mostUsedPref, 10) || 0;

  const { mostUsed, groupedTriggers } = useMemo(() => {
    const mostUsed = namedTriggers.slice(0, mostUsedCount);
    const groupedTriggers = new Map<string, NamedTrigger[]>();

    namedTriggers.slice(mostUsedCount).forEach((trigger) => {
      const groupName = trigger.groupName || defaultGroupName;
      if (!groupedTriggers.has(groupName)) {
        groupedTriggers.set(groupName, []);
      }
      groupedTriggers.get(groupName)?.push(trigger);
    });

    return { mostUsed, groupedTriggers };
  }, [namedTriggers, mostUsedCount, defaultGroupName]);

  const renderTriggerItem = useCallback(
    (trigger: NamedTrigger) => (
      <NamedTriggerListItem key={trigger.uuid} trigger={trigger} visitItem={visitItem} defaultAction={defaultAction} />
    ),
    [visitItem, defaultAction],
  );

  return (
    <>
      {mostUsedCount > 0 && (
        <List.Section title="Most Used" subtitle={mostUsedCount + ""}>
          {mostUsed.map(renderTriggerItem)}
        </List.Section>
      )}

      {Array.from(groupedTriggers.entries()).map(([groupName, triggers]) => (
        <List.Section key={groupName} title={groupName} subtitle={triggers?.length + ""}>
          {triggers.map(renderTriggerItem)}
        </List.Section>
      ))}
    </>
  );
}
