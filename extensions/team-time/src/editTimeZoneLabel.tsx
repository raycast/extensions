import {
  Form,
  ActionPanel,
  Action,
  LocalStorage,
  showToast,
  Toast,
  launchCommand,
  LaunchType,
  List,
} from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { computeTimeGroups } from "./utils";
import { TimeGroup } from "./types";

/**
 * This form lets the user override the default flags for each group of cities.
 */
export default function EditTeamTimeFlags() {
  const [groups, setGroups] = useState<TimeGroup[]>([]);
  const [customMapping, setCustomMapping] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const initializeData = useCallback(async () => {
    try {
      const [timeGroups, mappingRaw] = await Promise.all([
        computeTimeGroups(),
        LocalStorage.getItem<string>("team_time_custom_mapping"),
      ]);
      const mapping = mappingRaw ? JSON.parse(mappingRaw) : {};

      setGroups(timeGroups);
      setCustomMapping(mapping);
    } catch (error) {
      console.error("Error initializing data:", error);
      await showToast(Toast.Style.Failure, "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeData();
  }, [initializeData]);

  const handleChange = useCallback((signature: string, newValue: string) => {
    setCustomMapping((prev) => ({ ...prev, [signature]: newValue }));
  }, []);

  const handleSubmit = useCallback(async () => {
    try {
      await LocalStorage.setItem("team_time_custom_mapping", JSON.stringify(customMapping));
      await showToast(Toast.Style.Success, "Custom flags saved");
      await launchCommand({ name: "teamTimeOverview", type: LaunchType.Background });
    } catch (error) {
      console.error("Error saving data:", error);
      await showToast(Toast.Style.Failure, "Failed to save custom flags");
    }
  }, [customMapping]);

  const handleResetToDefault = useCallback(async () => {
    try {
      await LocalStorage.removeItem("team_time_custom_mapping");
      setCustomMapping({});
      await launchCommand({ name: "teamTimeOverview", type: LaunchType.Background });
      await showToast(Toast.Style.Success, "Reset to default");
    } catch (error) {
      console.error("Error resetting data:", error);
      await showToast(Toast.Style.Failure, "Failed to reset flags");
    }
  }, []);

  if (groups.length === 0) {
    return (
      <List>
        {groups.length === 0 ? (
          <List.EmptyView title="No Groups Found" description="Go to Manage Time Zones to add cities" />
        ) : (
          groups.map((group) => (
            <List.Item key={group.signature} title={group.cities.join(", ")} subtitle={group.time} />
          ))
        )}
      </List>
    );
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Save Custom Flags" />
          <Action title="Reset to Default" onAction={handleResetToDefault} />
        </ActionPanel>
      }
    >
      {groups.map((group) => {
        const timeLabel = `(${group.time}) ${group.cities.join(" / ")}`;
        const signature = group.signature;
        const currentValue = customMapping[signature] ?? group.combinedFlags;

        return (
          <Form.TextField
            key={signature}
            id={signature}
            title={timeLabel}
            placeholder="Enter custom flag"
            value={currentValue}
            onChange={(newValue) => handleChange(signature, newValue)}
          />
        );
      })}
    </Form>
  );
}
