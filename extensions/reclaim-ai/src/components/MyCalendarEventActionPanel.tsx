import { useEffect, useState, type FC } from "react";
import { Event } from "../types/event";
import { EventActions } from "../hooks/useEvent.types";
import { useEventActions } from "../hooks/useEvent";
import { useTaskActions } from "../hooks/useTask";
import { Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";
import { SNOOZE_OPTIONS } from "../consts/tasks.consts";

export type MyCalendarEventActionPanelProps = { event: Event };

export const MyCalendarEventActionPanel: FC<MyCalendarEventActionPanelProps> = ({ event }) => {
  /********************/
  /*   custom hooks   */
  /********************/

  const { getEventActions } = useEventActions();
  const { rescheduleTask } = useTaskActions();

  /********************/
  /*     useState     */
  /********************/

  const [eventActions, setEventActions] = useState<EventActions>([]);

  /********************/
  /* useMemo & consts */
  /********************/

  /********************/
  /*    useCallback   */
  /********************/

  const loadEventActions = () => {
    const actions = getEventActions(event);
    setEventActions(actions);
  };

  const handleRescheduleTask = async (taskId: string, reschedule: string, startDate?: Date) => {
    await showToast(Toast.Style.Animated, "Rescheduling event...");
    try {
      const task = await rescheduleTask(taskId, reschedule, startDate?.toISOString());

      if (task) {
        showToast(Toast.Style.Success, `Rescheduled"${event.title}" successfully!`);
      } else {
        throw new Error("Rescheduling failed.");
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error while rescheduling",
        message: String(error),
      });
    }
  };

  /********************/
  /*    useEffects    */
  /********************/

  useEffect(() => {
    void loadEventActions();
  }, []);

  /********************/
  /*       JSX        */
  /********************/

  return (
    <ActionPanel>
      {eventActions.map((action) => (
        <Action
          key={action.title}
          title={action.title}
          icon={action.icon}
          onAction={() => {
            action.action();
          }}
        />
      ))}
      {event.reclaimManaged === true && event.assist?.eventType === "TASK_ASSIGNMENT" && (
        <ActionPanel.Submenu title="Snooze Task" icon={Icon.ArrowClockwise}>
          {SNOOZE_OPTIONS.map((option) => (
            <Action
              key={option.title}
              title={option.title}
              onAction={() => {
                handleRescheduleTask(String(event.assist?.taskId), option.value);
              }}
            />
          ))}
        </ActionPanel.Submenu>
      )}
    </ActionPanel>
  );
};
