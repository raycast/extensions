import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Form,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getIntakes, deleteIntake, updateIntake } from "./utils/storage";
import { calculateCaffeineMetrics } from "./utils/caffeineModel";
import { getSettings } from "./utils/preferences";
import { CaffeineIntake } from "./types";
import { BUILT_IN_PRESETS } from "./utils/drinkPresets";
import { parseIntakeFromForm } from "./utils/intakeValidation";

/**
 * Format date as "Today", "Yesterday", or "MMM DD, YYYY"
 */
function formatDate(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (dateOnly.getTime() === today.getTime()) {
    return "Today";
  } else if (dateOnly.getTime() === yesterday.getTime()) {
    return "Yesterday";
  } else {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }
}

function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Format date as YYYY-MM-DD for use as a grouping key
 */
function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get color for status indicator
 */
import { getStatusColor, getStatusEmoji, getStatusMessage } from "./utils/statusHelpers";

interface EditFormValues {
  drinkType: string;
  caffeineAmount: string;
  amountDescription: string;
  intakeTime: Date | null;
}

function EditIntakeForm({ intake, onSave }: { intake: CaffeineIntake; onSave: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: EditFormValues) {
    const parsed = parseIntakeFromForm(values.caffeineAmount, values.intakeTime, intake.timestamp);
    if (!parsed) {
      return;
    }

    const { caffeineMg, chosenTime } = parsed;

    try {
      await updateIntake({
        ...intake,
        timestamp: chosenTime,
        amount: caffeineMg,
        drinkType: values.drinkType || intake.drinkType,
        amountDescription: values.amountDescription || undefined,
      });
      onSave();
      pop();
      showToast({ style: Toast.Style.Success, title: "Updated", message: "Intake record updated" });
    } catch {
      showToast({ style: Toast.Style.Failure, title: "Error", message: "Failed to update intake" });
    }
  }

  return (
    <Form
      navigationTitle="Edit Intake"
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Save Changes" icon={Icon.Checkmark} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="drinkType"
        title="Drink Type"
        defaultValue={intake.drinkType}
        placeholder={BUILT_IN_PRESETS[0]?.name ?? "Coffee"}
      />
      <Form.DatePicker
        id="intakeTime"
        title="Time"
        type={Form.DatePicker.Type.DateTime}
        defaultValue={intake.timestamp}
      />
      <Form.TextField
        id="amountDescription"
        title="Amount (Optional)"
        defaultValue={intake.amountDescription ?? ""}
        placeholder="e.g., 1 cup, 200ml"
      />
      <Form.TextField
        id="caffeineAmount"
        title="Caffeine Amount (mg)"
        defaultValue={String(intake.amount)}
        placeholder="Enter caffeine amount in milligrams"
      />
    </Form>
  );
}

/**
 * Group caffeine intakes by date (YYYY-MM-DD format)
 */
function groupIntakesByDate(intakes: CaffeineIntake[]): Map<string, CaffeineIntake[]> {
  const grouped = new Map<string, CaffeineIntake[]>();

  intakes.forEach((intake) => {
    const dateKey = formatDateKey(intake.timestamp);
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(intake);
  });

  return grouped;
}

export default function Command() {
  const { data: intakes, isLoading, revalidate } = useCachedPromise(getIntakes);

  const settings = getSettings();

  const calculation = intakes ? calculateCaffeineMetrics(intakes, settings) : null;

  const groupedIntakes = intakes ? groupIntakesByDate(intakes) : new Map();
  const sortedDates = Array.from(groupedIntakes.keys()).sort((a, b) => b.localeCompare(a));

  async function handleDelete(id: string, drinkType?: string, amount?: number) {
    const confirmed = await confirmAlert({
      title: "Delete Intake",
      message: `Are you sure you want to delete ${drinkType ? `"${drinkType}"` : "this intake"} (${amount ? `${amount} mg` : ""})?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteIntake(id);
      await revalidate();
      showToast({
        style: Toast.Style.Success,
        title: "Deleted",
        message: "Intake record deleted",
      });
    } catch {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to delete intake",
      });
    }
  }

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (!intakes || intakes.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Mug}
          title="No Caffeine Logged"
          description="Start logging your caffeine intake to track residual levels"
        />
      </List>
    );
  }

  const statusColor = calculation ? getStatusColor(calculation.status) : Color.PrimaryText;
  const statusEmoji = calculation ? getStatusEmoji(calculation.status) : "";
  const statusMessage = calculation ? getStatusMessage(calculation.status) : "Unknown";

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search intake history...">
      {/* Summary Section */}
      {calculation && (
        <List.Section title="Current Status">
          <List.Item
            icon={{ source: Icon.Info, tintColor: statusColor }}
            title={`${statusEmoji} ${statusMessage}`}
            subtitle={`Current: ${calculation.currentResidual.toFixed(1)} mg | Bedtime: ${calculation.predictedResidualAtBedtime.toFixed(1)} mg`}
            accessories={[{ text: `Today: ${calculation.todayTotal.toFixed(1)} mg` }]}
          />
          <List.Item
            icon={Icon.Heart}
            title="Current Residual Caffeine"
            subtitle={`${calculation.currentResidual.toFixed(1)} mg`}
            accessories={[{ text: "In your system now" }]}
          />
          <List.Item
            icon={Icon.Moon}
            title="Predicted Residual at Bedtime"
            subtitle={`${calculation.predictedResidualAtBedtime.toFixed(1)} mg`}
            accessories={[{ text: `Limit: ${settings.maxCaffeineAtBedtime} mg` }]}
          />
        </List.Section>
      )}

      {/* Intake History by Date */}
      {sortedDates.map((dateKey) => {
        const dateIntakes = groupedIntakes
          .get(dateKey)!
          .sort((a: CaffeineIntake, b: CaffeineIntake) => b.timestamp.getTime() - a.timestamp.getTime());
        const firstIntake = dateIntakes[0];
        const dateLabel = formatDate(firstIntake.timestamp);

        return (
          <List.Section key={dateKey} title={dateLabel}>
            {dateIntakes.map((intake: CaffeineIntake) => (
              <List.Item
                key={intake.id}
                icon={Icon.Tag}
                title={intake.drinkType}
                subtitle={intake.amountDescription || ""}
                accessories={[{ text: `${intake.amount} mg` }, { text: formatTime(intake.timestamp) }]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      icon={Icon.Pencil}
                      title="Edit Intake"
                      shortcut={Keyboard.Shortcut.Common.Edit}
                      target={<EditIntakeForm intake={intake} onSave={revalidate} />}
                    />
                    <Action
                      icon={Icon.Trash}
                      title="Delete Intake"
                      style={Action.Style.Destructive}
                      shortcut={{
                        macOS: { modifiers: ["cmd", "shift"], key: "delete" },
                        Windows: { modifiers: ["ctrl", "shift"], key: "delete" },
                      }}
                      onAction={() => handleDelete(intake.id, intake.drinkType, intake.amount)}
                    />
                    <Action
                      icon={Icon.ArrowClockwise}
                      title="Refresh"
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={revalidate}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
