import {
  List,
  ActionPanel,
  Action,
  Icon,
  useNavigation,
  showToast,
  Toast,
  confirmAlert,
  Form,
  Alert,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { BabyBuddyAPI, Child, DiaperEntry } from "../api";
import { formatTimeAgo, formatTimeWithTooltip } from "../utils";
import { formatErrorMessage } from "../utils/form-helpers";
import CreateDiaperForm from "./CreateDiaperForm";

// Define the available diaper colors
const DIAPER_COLORS = [
  { id: "black", name: "Black" },
  { id: "brown", name: "Brown" },
  { id: "green", name: "Green" },
  { id: "yellow", name: "Yellow" },
  { id: "white", name: "White" },
];

interface DiaperListProps {
  child: Child;
}

export default function DiaperList({ child }: DiaperListProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [diaperEntries, setDiaperEntries] = useState<DiaperEntry[]>([]);
  const navigation = useNavigation();

  async function fetchDiaperEntries() {
    setIsLoading(true);
    try {
      const api = new BabyBuddyAPI();
      const entries = await api.getRecentDiapers(child.id);
      // Sort by time, newest first
      entries.sort((a: DiaperEntry, b: DiaperEntry) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setDiaperEntries(entries);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Diaper Changes",
        message: formatErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function createDiaperAndNavigateBack() {
    await fetchDiaperEntries();
    navigation.pop();
  }

  useEffect(() => {
    fetchDiaperEntries();
  }, [child.id]);

  async function handleDeleteDiaper(diaper: DiaperEntry) {
    if (
      await confirmAlert({
        title: "Delete Diaper Change",
        message: `Are you sure you want to delete this diaper change from ${formatTimeAgo(diaper.time)}?`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        const api = new BabyBuddyAPI();
        await api.deleteDiaper(diaper.id);
        showToast({
          style: Toast.Style.Success,
          title: "Diaper Change Deleted",
          message: "The diaper change has been deleted",
        });
        fetchDiaperEntries();
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Delete Diaper Change",
          message: formatErrorMessage(error),
        });
      }
    }
  }

  function getIconForDiaperType(diaper: DiaperEntry) {
    if (diaper.wet && diaper.solid) {
      return Icon.Stars;
    } else if (diaper.wet) {
      return Icon.Droplets;
    } else if (diaper.solid) {
      return Icon.Circle;
    }
    return Icon.Circle;
  }

  function getDiaperTypeText(diaper: DiaperEntry) {
    const types = [];
    if (diaper.wet) types.push("Wet");
    if (diaper.solid) types.push("Solid");
    return types.join(" & ");
  }

  function getColorText(diaper: DiaperEntry) {
    if (diaper.solid && diaper.color) {
      return diaper.color.charAt(0).toUpperCase() + diaper.color.slice(1);
    }
    return "";
  }

  function getAmountText(diaper: DiaperEntry) {
    if (diaper.amount !== null) {
      return `${diaper.amount}`;
    }
    return "";
  }

  function handleCreateDiaper() {
    // Create a dummy timer with the child's ID
    const dummyTimer = {
      id: 0,
      name: "New Diaper Change",
      start: new Date().toISOString(),
      end: new Date().toISOString(),
      active: false,
      user: 0,
      child: child.id,
      duration: "0:00:00",
    };

    navigation.push(
      <CreateDiaperForm
        timer={dummyTimer}
        childName={`${child.first_name} ${child.last_name}`}
        onEventCreated={createDiaperAndNavigateBack}
      />,
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search diaper changes..."
      actions={
        <ActionPanel>
          <Action title="Create Diaper Change" icon={Icon.Plus} onAction={handleCreateDiaper} />
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchDiaperEntries} />
        </ActionPanel>
      }
    >
      <List.Section title="Diaper Changes">
        {diaperEntries.map((diaper) => (
          <DiaperListItem
            key={diaper.id}
            diaper={diaper}
            onDelete={() => handleDeleteDiaper(diaper)}
            onCreateDiaper={handleCreateDiaper}
            onRefresh={fetchDiaperEntries}
            getDiaperTypeText={getDiaperTypeText}
            getColorText={getColorText}
            getAmountText={getAmountText}
            getIconForDiaperType={getIconForDiaperType}
          />
        ))}
      </List.Section>
    </List>
  );
}

interface DiaperListItemProps {
  diaper: DiaperEntry;
  onDelete: () => void;
  onCreateDiaper: () => void;
  onRefresh: () => void;
  getDiaperTypeText: (diaper: DiaperEntry) => string;
  getColorText: (diaper: DiaperEntry) => string;
  getAmountText: (diaper: DiaperEntry) => string;
  getIconForDiaperType: (diaper: DiaperEntry) => Icon;
}

function DiaperListItem({
  diaper,
  onDelete,
  onCreateDiaper,
  onRefresh,
  getDiaperTypeText,
  getColorText,
  getAmountText,
  getIconForDiaperType,
}: DiaperListItemProps) {
  const navigation = useNavigation();
  const timeInfo = formatTimeWithTooltip(diaper.time);

  return (
    <List.Item
      title={getDiaperTypeText(diaper)}
      subtitle={getColorText(diaper)}
      accessories={[
        { text: timeInfo.text, tooltip: timeInfo.tooltip },
        { text: getAmountText(diaper) },
        { text: diaper.notes ? "📝" : "" },
      ]}
      icon={getIconForDiaperType(diaper)}
      actions={
        <ActionPanel>
          <Action
            title="Edit Diaper Change"
            icon={Icon.Pencil}
            onAction={() => {
              navigation.push(
                <EditDiaperForm
                  diaper={diaper}
                  onDiaperUpdated={() => {
                    showToast({
                      style: Toast.Style.Success,
                      title: "Diaper Change Updated",
                      message: "The diaper change has been updated",
                    });
                    navigation.pop();
                    // Refresh the diaper list after editing
                    onRefresh();
                  }}
                />,
              );
            }}
          />
          <Action title="Delete Diaper Change" icon={Icon.Trash} style={Action.Style.Destructive} onAction={onDelete} />
          <Action title="Create Diaper Change" icon={Icon.Plus} onAction={onCreateDiaper} />
        </ActionPanel>
      }
    />
  );
}

interface EditDiaperFormProps {
  diaper: DiaperEntry;
  onDiaperUpdated: () => void;
}

function EditDiaperForm({ diaper, onDiaperUpdated }: EditDiaperFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [time, setTime] = useState<Date>(new Date(diaper.time));
  const [isWet, setIsWet] = useState(diaper.wet);
  const [isSolid, setIsSolid] = useState(diaper.solid);
  const [color, setColor] = useState(diaper.color || "");
  const [amount, setAmount] = useState<string>(diaper.amount !== null ? diaper.amount.toString() : "");
  const [notes, setNotes] = useState(diaper.notes || "");
  const navigation = useNavigation();

  async function handleSubmit() {
    // Validate that at least one of wet or solid is selected
    if (!isWet && !isSolid) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid diaper change",
        message: "At least one of Wet or Solid must be selected",
      });
      return;
    }

    try {
      setIsLoading(true);
      const api = new BabyBuddyAPI();

      // Format date properly
      const timeISOString = time.toISOString();

      // Parse amount to number or null
      const amountValue = amount ? parseFloat(amount) : null;

      // Prepare the data
      const diaperData = {
        time: timeISOString,
        wet: isWet,
        solid: isSolid,
        color: isSolid ? color : "",
        amount: amountValue,
        notes: notes || "",
      };

      // Update the diaper entry
      await api.updateDiaper(diaper.id, diaperData);

      onDiaperUpdated();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Update Diaper Change",
        message: formatErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Diaper Change" onSubmit={handleSubmit} />
          <Action title="Cancel" onAction={() => navigation.pop()} />
        </ActionPanel>
      }
    >
      <Form.DatePicker
        id="time"
        title="Time"
        value={time}
        onChange={(newValue: Date | null) => newValue && setTime(newValue)}
      />

      <Form.Separator />

      <Form.Checkbox id="isWet" label="Wet" value={isWet} onChange={setIsWet} />

      <Form.Checkbox id="isSolid" label="Solid" value={isSolid} onChange={setIsSolid} />

      {isSolid && (
        <Form.Dropdown id="color" title="Color" value={color} onChange={setColor}>
          <Form.Dropdown.Item value="" title="Select a color" />
          {DIAPER_COLORS.map((colorOption) => (
            <Form.Dropdown.Item key={colorOption.id} value={colorOption.id} title={colorOption.name} />
          ))}
        </Form.Dropdown>
      )}

      <Form.TextField
        id="amount"
        title="Amount"
        placeholder="Enter amount (optional)"
        value={amount}
        onChange={setAmount}
      />

      <Form.TextArea
        id="notes"
        title="Notes"
        placeholder="Enter any notes about this diaper change"
        value={notes}
        onChange={setNotes}
      />
    </Form>
  );
}
