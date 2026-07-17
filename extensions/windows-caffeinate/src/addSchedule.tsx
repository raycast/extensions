import { useState } from "react";
import {
  LocalStorage,
  Color,
  showToast,
  Toast,
  Action,
  ActionPanel,
  Icon,
  List,
  Alert,
  confirmAlert,
} from "@raycast/api";
import { useLoadStoredSchedules } from "./hooks/useLoadStoredSchedules";
import { ListActionPanel } from "./components/ListActionPanel";
import {
  Schedule,
  changeScheduleState,
  stopCaffeinate,
  isTodaysSchedule,
  isNotTodaysSchedule,
  numberToDayString,
} from "./utils";
import { extractSchedule } from "./extractSchedule";
import { checkSchedule } from "./status";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  useLoadStoredSchedules(setSchedules, setIsLoading);

  const handleSetSchedule = async () => {
    try {
      const parsedSchedule = await extractSchedule(searchText);

      if (!parsedSchedule) {
        return;
      }
      const { days, from, to } = parsedSchedule;
      const newSchedules = days.map((day) => ({ day, from, to, IsManuallyDecafed: false, IsRunning: false }));

      for (const schedule of newSchedules) {
        await LocalStorage.setItem(schedule.day, JSON.stringify(schedule));
      }

      const currentDate = new Date();
      const currentDayString = numberToDayString(currentDate.getDay()).toLowerCase();
      const isScheduleRunning = await checkSchedule();

      const updatedSchedules = newSchedules.map((schedule) => {
        if (currentDayString === schedule.day) {
          return { ...schedule, IsRunning: isScheduleRunning };
        }
        return schedule;
      });

      setSchedules((prevSchedules) => [
        ...prevSchedules.filter((schedule) => !days.includes(schedule.day)),
        ...updatedSchedules,
      ]);

      await showToast(Toast.Style.Success, "Caffeination schedule set successfully.");
      setSearchText("");
    } catch (error) {
      console.error("Failed to set schedule:", error);
      await showToast(Toast.Style.Failure, "Failed to set schedule.");
    }
  };

  const handleDeleteSchedule = async (schedule: Schedule) => {
    const deleteConfirmation = await confirmAlert({
      title: "Delete schedule",
      message: "Are you sure you wish to delete this schedule?",
      primaryAction: {
        title: "Yes",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "No",
        style: Alert.ActionStyle.Cancel,
      },
      icon: {
        source: Icon.Trash,
        tintColor: Color.Red,
      },
    });

    if (deleteConfirmation) {
      try {
        if (schedule.IsRunning === true) await stopCaffeinate({ status: true });
        await LocalStorage.removeItem(schedule.day);
        await showToast(Toast.Style.Success, "Schedule deleted.");

        const updatedSchedules = schedules.filter((scheduleItem) => scheduleItem.day !== schedule.day);
        setSchedules(updatedSchedules);
      } catch (error) {
        console.error("Failed to delete schedule:", error);
        await showToast(Toast.Style.Failure, "Failed to delete schedule.");
      }
    }
  };

  const handlePauseSchedule = async (schedule: Schedule) => {
    try {
      // changeScheduleState is async (it awaits LocalStorage.setItem) — it was
      // previously called without awaiting, so the write to disk wasn't
      // guaranteed to finish before this function returned or before a
      // subsequent read of the same day's schedule.
      await changeScheduleState("decaffeinate", schedule);

      if (isTodaysSchedule(schedule)) {
        await stopCaffeinate({ status: true });
      }

      // Show success only after the state change and stop actually succeeded —
      // showing it first (as before) would claim success even if stopCaffeinate
      // then threw.
      await showToast(
        Toast.Style.Success,
        `Schedule for ${schedule.day.charAt(0).toUpperCase() + schedule.day.slice(1).toLowerCase()} is now paused`,
      );

      setSchedules((prevSchedules) =>
        prevSchedules.map((s) => (s.day === schedule.day ? { ...s, IsRunning: false, IsManuallyDecafed: true } : s)),
      );
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to pause schedule", String(error));
    }
  };

  const handleResumeSchedule = async (schedule: Schedule) => {
    try {
      await changeScheduleState("caffeinate", schedule);

      const isScheduled = await checkSchedule();

      await showToast(
        Toast.Style.Success,
        `Schedule for ${schedule.day.charAt(0).toUpperCase() + schedule.day.slice(1).toLowerCase()} is now resumed`,
      );

      setSchedules((prevSchedules) =>
        prevSchedules.map((s) =>
          s.day === schedule.day ? { ...s, IsRunning: isScheduled, IsManuallyDecafed: false } : s,
        ),
      );
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to resume schedule", String(error));
    }
  };

  return (
    <List
      searchText={searchText}
      isLoading={isLoading}
      searchBarPlaceholder="Schedule for Monday and Tuesday from 12:00 to 14:00"
      onSearchTextChange={setSearchText}
      filtering={false}
      actions={
        <ActionPanel>
          <Action autoFocus title="Set Schedule" icon={Icon.Calendar} onAction={handleSetSchedule} />
        </ActionPanel>
      }
    >
      {schedules.length === 0 ? (
        <List.EmptyView
          title="No caffeination schedules yet"
          description="To schedule, enter the days to be scheduled and time range, then hit enter!"
          icon={Icon.Calendar}
        />
      ) : (
        <>
          {["Today's Schedule", "Caffeination Schedule"].map((sectionTitle, index) => (
            <List.Section
              key={index}
              title={sectionTitle}
              children={schedules.filter(index === 0 ? isTodaysSchedule : isNotTodaysSchedule).map((schedule, idx) => (
                <List.Item
                  key={idx}
                  title={schedule.day.charAt(0).toUpperCase() + schedule.day.slice(1)}
                  accessories={[
                    {
                      text:
                        index === 0
                          ? schedule.IsRunning
                            ? "Running"
                            : schedule.IsManuallyDecafed
                              ? "Paused"
                              : "Scheduled"
                          : schedule.IsManuallyDecafed
                            ? "Scheduled Paused"
                            : "Scheduled",
                      icon:
                        index === 0
                          ? schedule.IsRunning
                            ? Icon.Play
                            : schedule.IsManuallyDecafed
                              ? Icon.Pause
                              : Icon.Calendar
                          : Icon.Calendar,
                    },
                  ]}
                  subtitle={`Set from ${schedule.from} to ${schedule.to}`}
                  icon={Icon.Calendar}
                  actions={
                    <ListActionPanel
                      searchText={searchText}
                      schedule={schedule}
                      onSetScheduleAction={handleSetSchedule}
                      onDeleteScheduleAction={handleDeleteSchedule}
                      onPauseScheduleAction={() => handlePauseSchedule(schedule)}
                      onResumeScheduleAction={() => handleResumeSchedule(schedule)}
                    />
                  }
                />
              ))}
            />
          ))}
        </>
      )}
    </List>
  );
}
