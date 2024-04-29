import React, { useContext, useEffect } from "react";
import { ActionPanel, Action, openExtensionPreferences, showToast, Toast, Icon, Image } from "@raycast/api";
import { Context } from "u/context";
import { getMonthName, getDayName } from "u/getName";
import { getAvatarIcon } from "@raycast/utils";

export default function Actions({ global, day }: { global?: boolean; day?: number }) {
  const {
    viewMode,
    setViewMode,
    enableWeek,
    setEnableWeek,
    enableTimer,
    setEnableTimer,
    currentYear,
    setCurrentYear,
    currentDay,
    setCurrentDay,
    currentMonth,
    setCurrentMonth,
  } = useContext(Context);

  const showDate = () => {
    const dateFormated = `${getDayName(currentDay)} ${currentDay}, ${getMonthName(currentMonth)} ${currentYear}`;
    const toast = showToast(Toast.Style.Success, dateFormated);
    return toast;
  };

  const navigateMonth = (offset: number) => {
    let newMonth = currentMonth + offset;
    let newYear = currentYear;

    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }

    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  const navigateYear = (offset: number) => {
    setCurrentYear(currentYear + offset);
    showDate();
  };

  const resetToCurrentDate = () => {
    const now = new Date();
    setCurrentMonth(now.getMonth() + 1);
    setCurrentYear(now.getFullYear());
  };

  const viewModes = ["compact", "normal", "comfortable"];

  const getNextViewMode = (currentViewMode: string) => {
    const currentIndex = viewModes.indexOf(currentViewMode);
    if (currentIndex === -1 || currentIndex === viewModes.length - 1) {
      return viewModes[0];
    } else {
      return viewModes[currentIndex + 1];
    }
  };

  const changeViewMode = () => {
    const newMode = getNextViewMode(viewMode);
    setViewMode(newMode);
    showToast(Toast.Style.Success, `View Mode: ${newMode.charAt(0).toUpperCase() + newMode.slice(1).toLowerCase()}`);
  };

  useEffect(() => {
    const now = new Date();
    const actualMonth = now.getMonth() + 1;
    const actualYear = now.getFullYear();

    if (currentMonth === actualMonth && currentYear === actualYear) {
      setCurrentDay(now.getDate());
    } else {
      setCurrentDay(0);
    }
  }, [currentMonth, currentYear]);

  return (
    <ActionPanel title="Navigation">
      <ActionPanel.Section>
        <Action
          title="Current Month"
          icon={Icon.Dot}
          shortcut={{ modifiers: ["shift"], key: "c" }}
          onAction={() => {
            resetToCurrentDate();
          }}
        />
        <Action
          title="Current Year"
          icon={Icon.RotateAntiClockwise}
          shortcut={{ modifiers: ["shift"], key: "y" }}
          onAction={() => showToast(Toast.Style.Success, "Current month")}
        />
        <Action
          title={`Previous Month (${getMonthName(currentMonth - 1)})`}
          icon={Icon.ChevronLeft}
          shortcut={{ modifiers: ["shift"], key: "arrowLeft" }}
          onAction={() => {
            navigateMonth(-1);
          }}
        />
        <Action
          title={`Next Month (${getMonthName(currentMonth + 1)})`}
          icon={Icon.ChevronRight}
          shortcut={{ modifiers: ["shift"], key: "arrowRight" }}
          onAction={() => {
            navigateMonth(1);
          }}
        />
        <Action
          title="Previous Year"
          icon={Icon.ChevronDown}
          shortcut={{ modifiers: ["shift"], key: "arrowDown" }}
          onAction={() => {
            navigateYear(-1);
          }}
        />
        <Action
          title="Next Year"
          icon={Icon.ChevronUp}
          shortcut={{ modifiers: ["shift"], key: "arrowUp" }}
          onAction={() => {
            navigateYear(1);
          }}
        />
      </ActionPanel.Section>
      {!global && (
        <>
          <Action.CopyToClipboard
            title="Copy Date"
            shortcut={{ modifiers: ["ctrl"], key: "c" }}
            content={
              day ? `${getDayName(day)} ${day}, ${getMonthName(currentMonth)} ${currentYear}` : "No date selected"
            }
            onCopy={() => {
              showToast(Toast.Style.Success, "Copied to clipboard");
            }}
          />
        </>
      )}
      <ActionPanel.Section title="Preferenes">
        <Action
          title="Change Density"
          icon={Icon.Store}
          shortcut={{ modifiers: ["shift"], key: "v" }}
          onAction={() => {
            changeViewMode();
          }}
        />
        <Action
          title="Toggle Week"
          icon={Icon.BarCode}
          shortcut={{ modifiers: ["shift"], key: "w" }}
          onAction={() => {
            setEnableWeek(!enableWeek);
          }}
        />
        <Action
          title="Toggle Time"
          icon={Icon.Clock}
          shortcut={{ modifiers: ["shift"], key: "t" }}
          onAction={() => {
            setEnableTimer(!enableTimer);
          }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Author">
        <Action.OpenInBrowser
          title="Astrit"
          icon={{ source: "https://github.com/astrit.png", mask: Image.Mask.Circle }}
          url="https://github.com/astrit"
        />
        <Action.OpenInBrowser
          title="Calist"
          icon={{ source: getAvatarIcon("C", { background: "#0e0f10", gradient: true }), mask: Image.Mask.Circle }}
          url="https://calist.io"
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Open Extension Preferences"
          icon={Icon.Gear}
          onAction={openExtensionPreferences}
          shortcut={{ modifiers: ["shift"], key: "p" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
