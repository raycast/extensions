import { List, Icon } from "@raycast/api";
import { useState, useMemo } from "react";
import type { Meeting, ActionItem } from "./types/Types";
import { buildActionItemsCopyText } from "./components/ActionItems";
import { useTeamColor } from "./hooks/useTeamColor";
import { ActionItemActions } from "./actions/ActionItemActions";

export function MeetingActionItemsDetail({ meeting }: { meeting: Meeting; recordingId?: string }) {
  // Use action items from the meeting object (already available)
  const actionItems = meeting.actionItems || [];
  const [selectedAssignee, setSelectedAssignee] = useState<string>("all");

  // Get unique assignees for the dropdown
  const assignees = useMemo(() => {
    const uniqueAssignees = new Set<string>();
    actionItems.forEach((item) => {
      const assigneeText = item.assignee.name || item.assignee.email || "Unassigned";
      uniqueAssignees.add(assigneeText);
    });
    return Array.from(uniqueAssignees).sort();
  }, [actionItems]);

  // Filter action items by selected assignee
  const filteredItems = useMemo(() => {
    if (selectedAssignee === "all") {
      return actionItems;
    }
    return actionItems.filter((item) => {
      const assigneeText = item.assignee.name || item.assignee.email || "Unassigned";
      return assigneeText === selectedAssignee;
    });
  }, [actionItems, selectedAssignee]);

  // Group by completion status
  const pending = filteredItems.filter((item) => !item.completed);
  const completed = filteredItems.filter((item) => item.completed);

  // Build copy content for action items
  const copyContent = buildActionItemsCopyText(filteredItems);

  return (
    <List
      navigationTitle={`${meeting.title} - Action Items`}
      searchBarPlaceholder="Search action items..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Assignee" value={selectedAssignee} onChange={setSelectedAssignee}>
          <List.Dropdown.Item title="All Assignees" value="all" icon={Icon.Person} />
          {assignees.length > 0 && (
            <List.Dropdown.Section title="Assignees">
              {assignees.map((assignee) => (
                <List.Dropdown.Item key={assignee} title={assignee} value={assignee} icon={Icon.Person} />
              ))}
            </List.Dropdown.Section>
          )}
        </List.Dropdown>
      }
    >
      {filteredItems.length === 0 ? (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="No Action Items"
          description={
            selectedAssignee === "all"
              ? "No action items for this meeting"
              : `No action items assigned to ${selectedAssignee}`
          }
        />
      ) : (
        <>
          {pending.length > 0 && (
            <List.Section title="Pending" subtitle={`${pending.length} items`}>
              {pending.map((item, index) => (
                <ActionItemListItem key={`pending-${index}`} item={item} meeting={meeting} copyContent={copyContent} />
              ))}
            </List.Section>
          )}

          {completed.length > 0 && (
            <List.Section title="Completed" subtitle={`${completed.length} items`}>
              {completed.map((item, index) => (
                <ActionItemListItem
                  key={`completed-${index}`}
                  item={item}
                  meeting={meeting}
                  copyContent={copyContent}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

function ActionItemListItem({
  item,
  meeting,
  copyContent,
}: {
  item: ActionItem;
  meeting: Meeting;
  copyContent: string;
}) {
  const assigneeText = item.assignee.name || item.assignee.email || "Unassigned";
  const aiBadge = !item.userGenerated ? "✨" : "";
  const teamColor = useTeamColor(item.assignee.team);

  const accessories: List.Item.Accessory[] = [];

  // Add AI badge
  if (aiBadge) {
    accessories.push({ text: aiBadge, tooltip: "AI-generated" });
  }

  // Add timestamp
  accessories.push({ text: item.recordingTimestamp, icon: Icon.Clock });

  // Add team tag if available
  if (item.assignee.team) {
    accessories.push({ tag: { value: item.assignee.team, color: teamColor || "#007AFF" } });
  }

  // Add assignee
  accessories.push({ text: assigneeText, icon: Icon.Person });

  return (
    <List.Item
      title={item.description.trim()}
      icon={item.completed ? Icon.CheckCircle : Icon.Circle}
      accessories={accessories}
      actions={<ActionItemActions item={item} meeting={meeting} allItemsCopyContent={copyContent} />}
    />
  );
}
