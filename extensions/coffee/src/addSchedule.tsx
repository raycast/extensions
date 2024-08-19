import { useState } from "react";
import { LocalStorage, Color, showToast, Toast, Action, ActionPanel, Icon, List, Alert, confirmAlert } from "@raycast/api";
import { useLoadStoredSchedules } from "./fetchStoredSchedule";
import { ListActionPanel } from "./listActionPanel";
import { Schedule, changeScheduleState, stopCaffeinate, startCaffeinate } from "./utils";
import { extractSchedule } from "./extractSchedule";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [lastUpdated, setLastUpdated] = useState(Date.now());

  useLoadStoredSchedules(setSchedules, setIsLoading, lastUpdated);

  const handleSetSchedule = async () => {
    try {
        const parsedSchedule = await extractSchedule(searchText);

    if (!parsedSchedule) {
      return;
    }
      const { days, from, to } = parsedSchedule;
      const newSchedules = days.map(day => ({ day, from, to, IsManuallyDecafed: false, IsRunning: false }));

      for (const schedule of newSchedules) {
        await LocalStorage.setItem(schedule.day, JSON.stringify(schedule));
      }

      await showToast(Toast.Style.Success, "Caffeination schedule set successfully.");
      setLastUpdated(Date.now());
    } catch (error) {
      console.error("Failed to set schedule:", error);
      await showToast(Toast.Style.Failure, "Failed to set schedule.");
    }
  };

  const handleDeleteSchedule = async (day: string) => {
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

    if (deleteConfirmation){
      try {
        await LocalStorage.removeItem(day);
        await showToast(Toast.Style.Success, "Schedule deleted.");
        setLastUpdated(Date.now());
      } catch (error) {
        console.error("Failed to delete schedule:", error);
        await showToast(Toast.Style.Failure, "Failed to delete schedule.");
      }
    }
  };

  const handlePauseSchedule = async (day:string) => {
    changeScheduleState("decaffeinate");
    await stopCaffeinate({ menubar: true, status: true }, `Schedule for ${day} is now paused`);
  }

  const handleResumeSchedule = async (day:string) => {
    changeScheduleState("caffeinate");
    await startCaffeinate({ menubar: true, status: true }, `Schedule for ${day} is now resumed`);
  }

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
          description="To schedule, type the days and time range, then hit enter!"
          icon={Icon.Calendar}
        />
      ) : (
        <List.Section title="Current Caffeination Schedule">
          {schedules.map((schedule, index) => (
            schedule?.day ? (
              <List.Item
                key={index}
                title={schedule.day.charAt(0).toUpperCase() + schedule.day.slice(1)}
                subtitle={`Set from ${schedule.from} to ${schedule.to}`}
                icon={Icon.Calendar}
                actions={
                  <ListActionPanel
                    searchText={searchText}
                    schedule={schedule}
                    onSetScheduleAction={handleSetSchedule}
                    onDeleteScheduleAction={handleDeleteSchedule}
                    onPauseScheduleAction={handlePauseSchedule}
                    onResumeScheduleAction={handleResumeSchedule}

                  />
                }
              />
            ) : (
              <List.Item
                key={index}
                title="Invalid schedule"
                subtitle="Schedule data is missing or incomplete"
              />
            )
          ))}
        </List.Section>
      )}
    </List>
  );
}
