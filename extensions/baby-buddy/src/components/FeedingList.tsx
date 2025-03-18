import { List, ActionPanel, Action, Icon, showToast, Toast, confirmAlert, Form } from "@raycast/api";
import { useState, useEffect } from "react";
import { BabyBuddyAPI, Child, FeedingEntry } from "../api";
import { formatTimeAgo, formatTimeWithTooltip } from "../utils";
import { formatErrorMessage } from "../utils/form-helpers";
import CreateFeedingForm from "./CreateFeedingForm";

interface FeedingListProps {
  child: Child;
}

export default function FeedingList({ child }: FeedingListProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [feedings, setFeedings] = useState<FeedingEntry[]>([]);

  async function fetchFeedings() {
    try {
      setIsLoading(true);
      const api = new BabyBuddyAPI();
      // Get all feedings for this child, sorted by newest first
      const feedingsData = await api.getFeedings(child.id, "", 100);
      setFeedings(feedingsData);
      setIsLoading(false);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch feedings",
        message: formatErrorMessage(error),
      });
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchFeedings();
  }, [child.id]);

  async function handleDeleteFeeding(feeding: FeedingEntry) {
    const shouldDelete = await confirmAlert({
      title: "Delete Feeding",
      message: `Are you sure you want to delete this feeding from ${formatTimeAgo(feeding.start)}?`,
      primaryAction: {
        title: "Delete",
      },
    });
    if (shouldDelete) {
      try {
        setIsLoading(true);
        const api = new BabyBuddyAPI();
        await api.deleteFeeding(feeding.id);
        showToast({
          style: Toast.Style.Success,
          title: "Feeding deleted",
        });
        fetchFeedings();
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete feeding",
          message: formatErrorMessage(error),
        });
        setIsLoading(false);
      }
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search feedings..."
      navigationTitle={`${child.first_name}'s Feedings`}
      actions={
        <ActionPanel>
          <Action.Push
            title="Create Feeding"
            icon={Icon.Plus}
            target={
              <CreateFeedingForm
                timer={{
                  id: 0,
                  name: "Feeding",
                  start: new Date().toISOString(),
                  end: null,
                  duration: null,
                  active: false,
                  user: 0,
                  child: child.id,
                }}
                childName={child.first_name}
                onEventCreated={fetchFeedings}
              />
            }
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={fetchFeedings}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      {feedings.map((feeding) => (
        <FeedingListItem
          key={feeding.id}
          feeding={feeding}
          childName={child.first_name}
          onFeedingDeleted={() => handleDeleteFeeding(feeding)}
          onFeedingUpdated={fetchFeedings}
        />
      ))}
    </List>
  );
}

interface FeedingListItemProps {
  feeding: FeedingEntry;
  childName: string;
  onFeedingDeleted: () => void;
  onFeedingUpdated: () => void;
}

function FeedingListItem({ feeding, childName, onFeedingDeleted, onFeedingUpdated }: FeedingListItemProps) {
  const timeInfo = formatTimeWithTooltip(feeding.start);

  // Format duration for display
  const formatDuration = (durationString: string) => {
    const [hours, minutes] = durationString.split(":").map(Number);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  // Get icon based on feeding type
  const getIconForFeedingType = (type: string) => {
    switch (type.toLowerCase()) {
      case "breast milk":
        return Icon.Droplets;
      case "fortified breast milk":
        return Icon.Stars;
      case "formula":
        return Icon.Mug;
      case "solid food":
        return Icon.Circle;
      default:
        return Icon.Mug;
    }
  };

  // Get the appropriate icon for the feeding type
  const icon = getIconForFeedingType(feeding.type);

  return (
    <List.Item
      title={`${feeding.type} (${feeding.method})`}
      subtitle={feeding.amount ? `${feeding.amount}` : undefined}
      accessories={[{ text: timeInfo.text, tooltip: timeInfo.tooltip }, { text: formatDuration(feeding.duration) }]}
      icon={icon}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Type" text={feeding.type} />
              <List.Item.Detail.Metadata.Label title="Method" text={feeding.method} />
              {feeding.amount && <List.Item.Detail.Metadata.Label title="Amount" text={`${feeding.amount}`} />}
              <List.Item.Detail.Metadata.Label title="Duration" text={formatDuration(feeding.duration)} />
              <List.Item.Detail.Metadata.Label title="Time" text={new Date(feeding.start).toLocaleString()} />
              <List.Item.Detail.Metadata.Separator />
              {feeding.notes && <List.Item.Detail.Metadata.Label title="Notes" text={feeding.notes} />}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="Edit Feeding"
            icon={Icon.Pencil}
            target={<EditFeedingForm feeding={feeding} childName={childName} onFeedingUpdated={onFeedingUpdated} />}
          />
          <Action
            title="Delete Feeding"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={onFeedingDeleted}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
          />
          <Action.Push
            title="Create Feeding"
            icon={Icon.Plus}
            target={
              <CreateFeedingForm
                timer={{
                  id: 0,
                  name: "Feeding",
                  start: new Date().toISOString(),
                  end: null,
                  duration: null,
                  active: false,
                  user: 0,
                  child: feeding.child,
                }}
                childName={childName}
                onEventCreated={onFeedingUpdated}
              />
            }
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={onFeedingUpdated}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
}

interface EditFeedingFormProps {
  feeding: FeedingEntry;
  childName: string;
  onFeedingUpdated: () => void;
}

function EditFeedingForm({ feeding, childName, onFeedingUpdated }: EditFeedingFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [type, setType] = useState(feeding.type);
  const [method, setMethod] = useState(feeding.method);
  const [amount, setAmount] = useState(feeding.amount?.toString() || "");
  const [notes, setNotes] = useState(feeding.notes || "");

  async function handleSubmit() {
    try {
      setIsLoading(true);
      const api = new BabyBuddyAPI();

      await api.updateFeeding(feeding.id, {
        type,
        method,
        amount: amount ? parseFloat(amount) : undefined,
        notes,
      });

      showToast({
        style: Toast.Style.Success,
        title: "Feeding updated",
      });

      onFeedingUpdated();
    } catch (error) {
      setIsLoading(false);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update feeding",
        message: formatErrorMessage(error),
      });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Edit Feeding for ${childName}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Feeding" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="type" title="Type" value={type} onChange={setType}>
        <Form.Dropdown.Item value="breast milk" title="Breast Milk" />
        <Form.Dropdown.Item value="formula" title="Formula" />
        <Form.Dropdown.Item value="solid food" title="Solid Food" />
        <Form.Dropdown.Item value="fortified breast milk" title="Fortified Breast Milk" />
      </Form.Dropdown>

      <Form.Dropdown id="method" title="Method" value={method} onChange={setMethod}>
        <Form.Dropdown.Item value="bottle" title="Bottle" />
        <Form.Dropdown.Item value="left breast" title="Left Breast" />
        <Form.Dropdown.Item value="right breast" title="Right Breast" />
        <Form.Dropdown.Item value="both breasts" title="Both Breasts" />
        <Form.Dropdown.Item value="parent fed" title="Parent Fed" />
        <Form.Dropdown.Item value="self fed" title="Self Fed" />
      </Form.Dropdown>

      <Form.TextField id="amount" title="Amount" placeholder="Enter amount" value={amount} onChange={setAmount} />

      <Form.TextArea id="notes" title="Notes" placeholder="Enter notes" value={notes} onChange={setNotes} />
    </Form>
  );
}
