import {
  List,
  Icon,
  ActionPanel,
  Action,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  getPreferenceValues,
  open,
} from "@raycast/api";
import { useState } from "react";
import {
  getClasses,
  getPeriods,
  deleteClass,
  getVaultPath,
} from "./utils/vault";
import { Class } from "./types";
import { getDay, set, isAfter, isBefore, formatDistanceToNow } from "date-fns";
import { ClassDetail } from "./components/ClassDetail";
import { QuickAddClass } from "./components/QuickAddClass";
import path from "path";
import { designTokens } from "./utils/design-tokens";

interface Preferences {
  vaultPath: string;
  defaultView: "all" | "classes";
  externalEditor?: { name: string; path: string };
  obsidianVaultName?: string;
  obsidianSubfolder?: string;
}

interface ClassWithTime extends Class {
  startTime?: string;
  endTime?: string;
  periodLabel?: string;
  startTimeDate?: Date;
  endTimeDate?: Date;
  isFreePeriod?: boolean;
}

export default function Command() {
  const { base, accent } = designTokens.colors;
  const preferences = getPreferenceValues<Preferences>();
  const showAllPeriods = preferences.defaultView === "all";
  const [, setRefreshKey] = useState(0);

  const allClasses = getClasses();
  const allPeriods = getPeriods();
  const now = new Date();
  const dayOfWeek = getDay(now);

  const refreshClasses = () => setRefreshKey((k) => k + 1);

  // Filter classes for today
  const todaysClasses = allClasses.filter((c) =>
    c.occurrences.some((o) => o.dayOfWeek === dayOfWeek),
  );

  // Add time information to classes
  const classesWithTime: ClassWithTime[] = todaysClasses.map((c) => {
    const occurrence = c.occurrences.find((o) => o.dayOfWeek === dayOfWeek);
    if (!occurrence) return { ...c, isFreePeriod: false };

    const periodId = `period-${occurrence.period}`;
    const period = allPeriods.find((p) => p.id === periodId);

    let startTimeDate: Date | undefined;
    let endTimeDate: Date | undefined;

    if (period?.startTime && period?.endTime) {
      const [startHour, startMinute] = period.startTime.split(":").map(Number);
      const [endHour, endMinute] = period.endTime.split(":").map(Number);
      startTimeDate = set(now, {
        hours: startHour,
        minutes: startMinute,
        seconds: 0,
      });
      endTimeDate = set(now, {
        hours: endHour,
        minutes: endMinute,
        seconds: 0,
      });
    }

    return {
      ...c,
      startTime: period?.startTime,
      endTime: period?.endTime,
      periodLabel: period?.label,
      startTimeDate,
      endTimeDate,
      isFreePeriod: false,
    };
  });

  // Sort classes by start time
  classesWithTime.sort((a, b) => {
    if (!a.startTimeDate) return 1;
    if (!b.startTimeDate) return -1;
    return a.startTimeDate.getTime() - b.startTimeDate.getTime();
  });

  // Build all periods view (including free periods)
  const allPeriodsItems: ClassWithTime[] = allPeriods
    .filter((p) => !p.isSpecial)
    .map((period) => {
      const periodNum = period.id.replace("period-", "");
      const existingClass = classesWithTime.find((c) => {
        const occurrence = c.occurrences.find((o) => o.dayOfWeek === dayOfWeek);
        return occurrence?.period === periodNum;
      });

      if (existingClass) {
        return existingClass;
      }

      // Create free period
      let startTimeDate: Date | undefined;
      let endTimeDate: Date | undefined;

      if (period.startTime && period.endTime) {
        const [startHour, startMinute] = period.startTime
          .split(":")
          .map(Number);
        const [endHour, endMinute] = period.endTime.split(":").map(Number);
        startTimeDate = set(now, {
          hours: startHour,
          minutes: startMinute,
          seconds: 0,
        });
        endTimeDate = set(now, {
          hours: endHour,
          minutes: endMinute,
          seconds: 0,
        });
      }

      return {
        id: `free-${period.id}`,
        name: "Free Period",
        occurrences: [],
        content: "",
        startTime: period.startTime,
        endTime: period.endTime,
        periodLabel: period.label,
        startTimeDate,
        endTimeDate,
        isFreePeriod: true,
      };
    })
    .sort((a, b) => {
      if (!a.startTimeDate) return 1;
      if (!b.startTimeDate) return -1;
      return a.startTimeDate.getTime() - b.startTimeDate.getTime();
    });

  const itemsToShow = showAllPeriods ? allPeriodsItems : classesWithTime;

  // Find current period (any period we're in right now)
  const currentPeriod = allPeriodsItems.find(
    (c) =>
      c.startTimeDate &&
      c.endTimeDate &&
      !isBefore(now, c.startTimeDate) &&
      isBefore(now, c.endTimeDate),
  );

  // Find next class (not a free period)
  const nextClass = classesWithTime.find(
    (c) => c.startTimeDate && isAfter(c.startTimeDate, now),
  );

  return (
    <List searchBarPlaceholder="Search today's classes...">
      {itemsToShow.length === 0 ? (
        <List.EmptyView icon={Icon.Calendar} title="No classes today" />
      ) : (
        itemsToShow.map((c) => {
          let statusIcon = Icon.Circle;
          let statusColor: string = accent.primary;

          if (c.startTimeDate && c.endTimeDate) {
            if (isAfter(now, c.endTimeDate)) {
              statusIcon = Icon.CheckCircle;
              statusColor = base.text.secondary;
            } else if (isBefore(now, c.startTimeDate)) {
              statusIcon = Icon.Clock;
              statusColor = accent.primary;
            } else {
              statusIcon = Icon.Stopwatch;
              statusColor = accent.primary;
            }
          }

          const periodNumber = c.periodLabel?.split(" ")[0] || "";
          const title = c.isFreePeriod
            ? `${periodNumber}.`
            : `${periodNumber}. ${c.name}`;

          // Build status text
          let statusText = "";

          // If this is the current period, show time until end
          if (currentPeriod && c.id === currentPeriod.id && c.endTimeDate) {
            statusText = `Ends ${formatDistanceToNow(c.endTimeDate, { addSuffix: true })}`;
          }
          // If this is the next class, show time until start
          else if (nextClass && c.id === nextClass.id && c.startTimeDate) {
            statusText = `Starts ${formatDistanceToNow(c.startTimeDate, { addSuffix: true })}`;
          }

          return (
            <List.Item
              key={c.id}
              icon={{
                source: c.isFreePeriod ? Icon.Circle : Icon.CircleFilled,
                tintColor: statusColor,
              }}
              title={title}
              accessories={[
                ...(statusText ? [{ text: statusText }] : []),
                {
                  text:
                    c.startTime && c.endTime
                      ? `${c.startTime} - ${c.endTime}`
                      : undefined,
                },
                {
                  icon: { source: statusIcon, tintColor: statusColor },
                },
              ]}
              actions={
                <ActionPanel>
                  {!c.isFreePeriod && (
                    <>
                      <Action.Push
                        title="Show Notes"
                        icon={Icon.Document}
                        target={
                          <ClassDetail
                            allClasses={classesWithTime.filter(
                              (cls) => !cls.isFreePeriod,
                            )}
                            currentIndex={classesWithTime
                              .filter((cls) => !cls.isFreePeriod)
                              .findIndex((cls) => cls.id === c.id)}
                          />
                        }
                      />
                      <Action
                        title="Delete Class"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                        onAction={async () => {
                          if (
                            await confirmAlert({
                              title: "Delete Class",
                              message: `Move "${c.name}" to bin?`,
                              primaryAction: {
                                title: "Delete",
                                style: Alert.ActionStyle.Destructive,
                              },
                            })
                          ) {
                            try {
                              deleteClass(c.id);
                              refreshClasses();
                              showToast({
                                style: Toast.Style.Success,
                                title: "Class moved to bin",
                              });
                            } catch (error) {
                              showToast({
                                style: Toast.Style.Failure,
                                title: "Failed to delete",
                              });
                            }
                          }
                        }}
                      />
                      <Action
                        title="Open in Planwell"
                        icon={Icon.AppWindow}
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                        onAction={async () => {
                          const vaultPath = getVaultPath();
                          const filePath = path.join(
                            vaultPath,
                            "classes",
                            `${c.id}.md`,
                          );
                          await open(filePath, "PlanWell.md");
                        }}
                      />
                      {preferences.externalEditor && (
                        <Action
                          title="Open in External Editor"
                          icon={Icon.TextDocument}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                          onAction={async () => {
                            const vaultPath = getVaultPath();
                            const filePath = path.join(
                              vaultPath,
                              "classes",
                              `${c.id}.md`,
                            );
                            const editorName =
                              preferences.externalEditor!.name.toLowerCase();

                            if (
                              editorName.includes("obsidian") &&
                              preferences.obsidianVaultName
                            ) {
                              // Use Obsidian protocol URL with vault name
                              const subfolder = preferences.obsidianSubfolder
                                ? `${preferences.obsidianSubfolder}/`
                                : "";
                              const relativePath = `${subfolder}classes/${c.id}.md`;
                              const obsidianUrl = `obsidian://open?vault=${encodeURIComponent(preferences.obsidianVaultName)}&file=${encodeURIComponent(relativePath)}`;
                              await open(obsidianUrl);
                            } else {
                              await open(
                                filePath,
                                preferences.externalEditor!.path,
                              );
                            }
                          }}
                        />
                      )}
                    </>
                  )}
                  {c.isFreePeriod && (
                    <Action.Push
                      title="Quick Add Class"
                      icon={Icon.Plus}
                      target={
                        <QuickAddClass
                          period={c.id.replace("free-period-", "")}
                          dayOfWeek={dayOfWeek}
                          onClassAdded={refreshClasses}
                        />
                      }
                    />
                  )}
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={refreshClasses}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
