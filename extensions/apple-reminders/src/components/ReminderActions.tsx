import { Action, ActionPanel, Color, Icon, Keyboard, Toast, confirmAlert, showToast } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { format } from "date-fns";
import {
  deleteReminder,
  setPriorityStatus,
  toggleCompletionStatus,
  setDueDate as setReminderDueDate,
  setLocation,
} from "swift:../../swift/AppleReminders";

import { CreateReminderForm } from "../create-reminder";
import { getPriorityIcon } from "../helpers";
import { Priority, Reminder, List as TList } from "../hooks/useData";
import useLocations, { Location } from "../hooks/useLocations";
import { ViewProps } from "../hooks/useViewReminders";

import EditReminder from "./EditReminder";
import LocationForm from "./LocationForm";

type ReminderActionsProps = {
  reminder: Reminder;
  mutate: MutatePromise<{ reminders: Reminder[]; lists: TList[] } | undefined>;
  listId?: string;
  viewProps: ViewProps;
};

export default function ReminderActions({ reminder, listId, viewProps, mutate }: ReminderActionsProps) {
  const { locations } = useLocations();

  async function toggleReminder() {
    async function toggle() {
      await mutate(toggleCompletionStatus(reminder.id), {
        optimisticUpdate(data) {
          if (!data) return;

          return {
            ...data,
            reminders: data.reminders.map((r) => {
              if (reminder.id === r.id) {
                return { ...r, isCompleted: !r.isCompleted };
              }

              return r;
            }),
          };
        },
      });
    }

    try {
      await toggle();
      await showToast({
        style: Toast.Style.Success,
        title: reminder.isCompleted ? "Marked reminder as incomplete" : "Completed Reminder",
        message: reminder.title,
        primaryAction: {
          title: "Undo",
          shortcut: { modifiers: ["cmd"], key: "z" },
          onAction: async (toast) => {
            await toggle();
            toast.hide();
          },
        },
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Unable to mark reminder as ${reminder.isCompleted ? "incomplete" : "complete"}`,
        message: reminder.title,
      });
    }
  }

  async function setPriority(priority: Priority) {
    try {
      await mutate(setPriorityStatus({ reminderId: reminder.id, priority }), {
        optimisticUpdate(data) {
          if (!data) return;

          return {
            ...data,
            reminders: data.reminders.map((r) => {
              if (reminder.id === r.id) {
                return { ...r, priority };
              }

              return r;
            }),
          };
        },
      });
      await showToast({
        style: Toast.Style.Success,
        title: priority ? "Set priority" : "Removed priority",
        message: priority ? `Changed to ${priority}` : "",
      });
    } catch (error) {
      console.error(error);
      await showToast({
        style: Toast.Style.Failure,
        title: `Unable to set priority`,
      });
    }
  }

  async function setDueDate(date: Date | null) {
    try {
      let newDate: string | null = null;
      if (date) {
        newDate = Action.PickDate.isFullDay(date) ? format(date, "yyyy-MM-dd") : date.toISOString();
      }

      await mutate(setReminderDueDate({ reminderId: reminder.id, dueDate: newDate }), {
        optimisticUpdate(data) {
          if (!data) return;

          return {
            ...data,
            reminders: data.reminders.map((r) => {
              if (reminder.id === r.id) {
                return { ...r, dueDate: newDate };
              }

              return r;
            }),
          };
        },
      });
      await showToast({
        style: Toast.Style.Success,
        title: date ? "Updated due date" : "Removed due date",
        message: date ? `Now due on ${format(date, "EEEE dd MMMM")}` : "",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to update due date",
      });
    }
  }

  async function setReminderLocation(location: Location) {
    try {
      const radius = parseInt(location.radius);

      await mutate(
        setLocation({
          reminderId: reminder.id,
          address: location.address,
          proximity: location.proximity,
          radius,
        }),
      );
      await showToast({
        style: Toast.Style.Success,
        title: "Set location reminder",
        message: location.name,
      });
    } catch (error) {
      console.error(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to set location reminder",
      });
    }
  }

  async function deleteReminderAction() {
    if (
      await confirmAlert({
        title: "Delete Reminder",
        message: "Are you sure you want to delete this reminder?",
        icon: { source: Icon.Trash, tintColor: Color.Red },
      })
    ) {
      try {
        await mutate(deleteReminder(reminder.id), {
          optimisticUpdate(data) {
            if (!data) return;

            return {
              ...data,
              reminders: data.reminders.filter((r) => r.id !== reminder.id),
            };
          },
        });
        await showToast({
          style: Toast.Style.Success,
          title: "Deleted Reminder",
          message: reminder.title,
        });
      } catch (error) {
        console.log(error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Unable to delete reminder",
          message: reminder.title,
        });
      }
    }
  }

  return (
    <ActionPanel title={reminder.title}>
      <Action
        title={reminder.isCompleted ? "Mark as Incomplete" : "Mark as Complete"}
        icon={reminder.isCompleted ? Icon.Circle : { source: Icon.Checkmark, tintColor: Color.Green }}
        onAction={toggleReminder}
      />

      <Action.Open
        title="Open Reminder"
        target={reminder.openUrl}
        icon={{ fileIcon: "/System/Applications/Reminders.app" }}
        application="com.apple.reminders"
      />

      <ActionPanel.Section>
        <Action.Push
          icon={Icon.Pencil}
          title="Edit Reminder"
          target={<EditReminder reminder={reminder} mutate={mutate} />}
          shortcut={Keyboard.Shortcut.Common.Edit}
        />

        <ActionPanel.Submenu
          title="Set Priority"
          icon={Icon.Exclamationmark}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        >
          <Action title="None" onAction={() => setPriority(null)} />
          <Action title="High" icon={getPriorityIcon("high")} onAction={() => setPriority("high")} />
          <Action title="Medium" icon={getPriorityIcon("medium")} onAction={() => setPriority("medium")} />
          <Action title="Low" icon={getPriorityIcon("low")} onAction={() => setPriority("low")} />
        </ActionPanel.Submenu>

        <Action.PickDate
          title="Set Due Date"
          icon={Icon.Clock}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onChange={setDueDate}
        />

        <ActionPanel.Submenu title="Set Location" icon={Icon.Pin} shortcut={{ modifiers: ["cmd"], key: "l" }}>
          {locations.map((location) => (
            <Action
              key={location.id}
              title={location.name}
              icon={location.icon}
              onAction={() => setReminderLocation(location)}
            />
          ))}

          <Action.Push
            title="Custom Location"
            icon={Icon.Pencil}
            target={<LocationForm onSubmit={setReminderLocation} isCustomLocation />}
          />
        </ActionPanel.Submenu>

        <Action
          title="Delete Reminder"
          style={Action.Style.Destructive}
          icon={Icon.Trash}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={deleteReminderAction}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title={`${viewProps.completed.value ? "Hide" : "Display"} Completed Reminders`}
          icon={viewProps.completed.value ? Icon.EyeDisabled : Icon.Eye}
          shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
          onAction={() => viewProps.completed.toggle()}
        />

        {viewProps.groupBy ? (
          <ActionPanel.Submenu
            title="Group By"
            icon={Icon.AppWindowGrid3x3}
            shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
          >
            {viewProps.groupBy.options.map((option) => {
              return (
                <Action
                  key={option.value}
                  title={option.label}
                  icon={option.icon}
                  autoFocus={viewProps.groupBy?.value === option.value}
                  onAction={() => viewProps.groupBy?.setValue(option.value)}
                />
              );
            })}
          </ActionPanel.Submenu>
        ) : null}

        <ActionPanel.Submenu
          title="Sort By"
          icon={Icon.BulletPoints}
          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
        >
          {viewProps.sortBy.options.map((option) => {
            return (
              <Action
                key={option.value}
                title={option.label}
                icon={option.icon}
                autoFocus={viewProps.sortBy.value === option.value}
                onAction={() => viewProps.sortBy.setValue(option.value)}
              />
            );
          })}
        </ActionPanel.Submenu>

        {viewProps.orderBy ? (
          <ActionPanel.Submenu
            title="Order By"
            icon={viewProps.orderBy.value === "desc" ? Icon.ArrowDown : Icon.ArrowUp}
            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
          >
            {viewProps.orderBy.options.map((option) => {
              return (
                <Action
                  key={option.value}
                  title={option.label}
                  icon={option.icon}
                  autoFocus={viewProps.orderBy?.value === option.value}
                  onAction={() => viewProps.orderBy?.setValue(option.value)}
                />
              );
            })}
          </ActionPanel.Submenu>
        ) : null}

        <Action.Push
          title="Create Reminder"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          target={<CreateReminderForm listId={listId} />}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Reminder Title"
          content={reminder.title}
          shortcut={{ modifiers: ["cmd"], key: "." }}
        />
        <Action.CopyToClipboard
          title="Copy Reminder Notes"
          content={reminder.notes}
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
        />
        <Action.CopyToClipboard
          title="Copy Reminder URL"
          content={reminder.openUrl}
          shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={() => mutate()}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
