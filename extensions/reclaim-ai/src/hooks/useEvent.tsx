import { Icon, getPreferenceValues, open } from "@raycast/api";
import { format, isWithinInterval } from "date-fns";
import { useCallback } from "react";
import { Event } from "../types/event";
import { axiosPromiseData } from "../utils/axiosPromise";
import { formatDisplayEventHours, formatDisplayHours } from "../utils/dates";
import { parseEmojiField } from "../utils/string";
import reclaimApi from "./useApi";
import { ApiResponseEvents, EventActions } from "./useEvent.types";
import { useUser } from "./useUser";
import { useTask } from "./useTask";
import { NativePreferences } from "../types/preferences";
import { CalendarAccount } from "../types/account";

const useEvent = () => {
  const { fetcher } = reclaimApi();
  const { currentUser } = useUser();
  const { handleStartTask, handleStopTask } = useTask();
  const { apiUrl } = getPreferenceValues<NativePreferences>();

  const fetchEvents = async ({ start, end }: { start: Date; end: Date }) => {
    try {
      const strStart = format(start, "yyyy-MM-dd");
      const strEnd = format(end, "yyyy-MM-dd");

      const [accountsResponse, accountsError] = await axiosPromiseData<CalendarAccount[]>(
        fetcher("/accounts", {
          method: "GET",
        })
      );

      if (!accountsResponse || accountsError) throw accountsError;

      const [eventsResponse, error] = await axiosPromiseData<ApiResponseEvents>(
        fetcher("/events?sourceDetails=true", {
          method: "GET",
          params: {
            start: strStart,
            end: strEnd,
            calendarIds: accountsResponse
              .flatMap(({ connectedCalendars }) => connectedCalendars.map(({ id }) => id))
              .join(","),
          },
        })
      );

      if (!eventsResponse || error) throw error;

      // Filter out events that are synced, managed by Reclaim and part of multiple calendars
      return eventsResponse;
    } catch (error) {
      console.error("Error while fetching events", error);
    }
  };

  const showFormattedEventTitle = useCallback(
    (event: Event, mini = false) => {
      const meridianFormat = currentUser?.settings.format24HourTime ? "24h" : "12h";

      const hours = mini
        ? formatDisplayHours(new Date(event.eventStart), meridianFormat)
        : formatDisplayEventHours({
            start: new Date(event.eventStart),
            end: new Date(event.eventEnd),
            hoursFormat: meridianFormat,
          });

      const realEventTitle = event.sourceDetails?.title || event.title;
      return `${hours}  ${parseEmojiField(realEventTitle).textWithoutEmoji}`;
    },
    [currentUser]
  );

  const handleStartHabit = async (id: string) => {
    try {
      const [habit, error] = await axiosPromiseData(fetcher(`/planner/start/habit/${id}`, { method: "POST" }));
      if (!habit || error) throw error;
      return habit;
    } catch (error) {
      console.error("Error while starting habit", error);
    }
  };

  const handleStopHabit = async (id: string) => {
    try {
      const [habit, error] = await axiosPromiseData(fetcher(`/planner/stop/habit/${id}`, { method: "POST" }));
      if (!habit || error) throw error;
      return habit;
    } catch (error) {
      console.error("Error while stopping habit", error);
    }
  };

  const getEventActions = useCallback((event: Event): EventActions => {
    const isHappening = isWithinInterval(new Date(), {
      end: new Date(event.eventEnd),
      start: new Date(event.eventStart),
    });

    const eventActions: EventActions = [];

    if (event.onlineMeetingUrl) {
      eventActions.push({
        icon: Icon.Camera,
        title: "Join meeting",
        action: () => {
          open(event.onlineMeetingUrl);
        },
      });
    }

    switch (event.assist?.eventType) {
      case "TASK_ASSIGNMENT":
        isHappening
          ? eventActions.push({
              icon: Icon.Stop,
              title: "Complete",
              action: async () => {
                event.assist?.taskId && (await handleStopTask(String(event.assist.taskId)));
              },
            })
          : eventActions.push({
              icon: Icon.Play,
              title: "Start",
              action: async () => {
                event.assist?.taskId && (await handleStartTask(String(event.assist.taskId)));
              },
            });
        eventActions.push({
          icon: Icon.Calendar,
          title: "Open in Planner",
          action: () => {
            open(
              `https://app.reclaim.ai/planner?eventId=${event.eventId}&type=task&assignmentId=${event.assist?.taskId}`
            );
          },
        });
        break;
      case "ONE_ON_ONE_ASSIGNMENT":
        eventActions.push({
          icon: Icon.Calendar,
          title: "Open in Planner",
          action: () => {
            open(
              `https://app.reclaim.ai/planner?eventId=${event.eventId}&type=one-on-one&assignmentId=${event.assist?.dailyHabitId}`
            );
          },
        });
        break;
      case "HABIT_ASSIGNMENT":
        isHappening
          ? eventActions.push({
              icon: Icon.Stop,
              title: "Complete",
              action: async () => {
                event.assist?.dailyHabitId && (await handleStopHabit(String(event.assist?.dailyHabitId)));
              },
            })
          : eventActions.push({
              icon: Icon.Play,
              title: "Start",
              action: async () => {
                event.assist?.dailyHabitId && (await handleStartHabit(String(event.assist?.dailyHabitId)));
              },
            });

        eventActions.push({
          icon: Icon.Calendar,
          title: "Open in Planner",
          action: () => {
            open(
              `https://app.reclaim.ai/planner?eventId=${event.eventId}&type=habit&assignmentId=${event.assist?.dailyHabitId}`
            );
          },
        });

        break;
    }

    eventActions.push({
      icon: Icon.Calendar,
      title: "Open in Google Calendar",
      action: () => {
        open(`${apiUrl}/events/view/${event.key}`);
      },
    });

    return eventActions;
  }, []);

  const handleRescheduleTask = async (calendarID: string, eventID: string, rescheduleCommand: string) => {
    try {
      const [task, error] = await axiosPromiseData(
        fetcher(`/planner/task/${calendarID}/${eventID}/reschedule?snoozeOption=${rescheduleCommand}`, {
          method: "POST",
        })
      );
      if (!task || error) throw error;
      return task;
    } catch (error) {
      console.error("Error while rescheduling event", error);
    }
  };

  return {
    fetchEvents,
    getEventActions,
    showFormattedEventTitle,
    handleRescheduleTask,
  };
};

export { useEvent };
