import { useState, useEffect, useMemo } from "react";
import { List, ActionPanel, Action, showToast, Toast, Icon, Color, getPreferenceValues, open } from "@raycast/api";
import { getSegments, Segment } from "./api"; // Added getSegments back
import SegmentDetail from "./segment-detail";
import { formatRelativeTime } from "./utils/format-date";
import { isDataDrivenSegment } from "./utils/formatters";

function getSegmentTypeIcon(type: string): Icon {
  return isDataDrivenSegment(type) ? Icon.Cloud : Icon.WrenchScrewdriver;
}

export default function SegmentList() {
  const preferences = getPreferenceValues<{ workspace_id?: string }>();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("all");

  useEffect(() => {
    getSegments()
      .then((data) => {
        setSegments(data);
      })
      .catch((error) => {
        showToast({ title: "Error loading segments", message: error.message, style: Toast.Style.Failure });
        setSegments([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredSegments = useMemo(() => {
    let filtered = segments;
    if (selectedType === "data_driven") {
      filtered = segments.filter((s) => isDataDrivenSegment(s.type));
    } else if (selectedType === "manual") {
      filtered = segments.filter((s) => !isDataDrivenSegment(s.type));
    }
    return filtered.sort((a, b) => b.updated_at - a.updated_at);
  }, [segments, selectedType]);

  return (
    <List
      isLoading={loading}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by type" value={selectedType} onChange={setSelectedType}>
          <List.Dropdown.Item title="All Types" value="all" />
          <List.Dropdown.Item title="Data-driven" value="data_driven" />
          <List.Dropdown.Item title="Manual" value="manual" />
        </List.Dropdown>
      }
    >
      {filteredSegments.map((segment) => (
        <List.Item
          key={segment.id}
          icon={{ source: getSegmentTypeIcon(segment.type), tintColor: Color.Blue }}
          title={segment.name}
          accessories={[
            { tag: { value: isDataDrivenSegment(segment.type) ? "Data-driven" : "Manual" } },
            // Only show state badge for drafts
            ...(segment.state && segment.state.toLowerCase() === "draft"
              ? [{ tag: { value: "Draft", color: Color.SecondaryText } }]
              : []),
            { text: formatRelativeTime(segment.updated_at) },
          ]}
          actions={
            <ActionPanel>
              <Action.Push title="View Details" icon={Icon.Eye} target={<SegmentDetail id={segment.id} />} />
              <Action
                title="Open in Customer.io"
                icon={Icon.Globe}
                onAction={() => {
                  if (!preferences.workspace_id) {
                    showToast({
                      title: "Workspace ID not configured",
                      message: "Please set your Workspace ID in Raycast extension preferences",
                      style: Toast.Style.Failure,
                    });
                    return;
                  }
                  const url = `https://fly.customer.io/workspaces/${preferences.workspace_id}/journeys/segments/${segment.id}/overview`;
                  open(url);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
