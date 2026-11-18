import { useState } from "react";
import { getSchedule, Schedule } from "./data/schedule";
import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { getWeek } from "date-fns";
import { useCachedPromise } from "@raycast/utils";

const WEEK_DAYS_AZ = ["Bazar", "Bazar ertəsi", "Çərşənbə axşamı", "Çərşənbə", "Cümə axşamı", "Cümə", "Şənbə"];

const DAY_TRANSLATION: Record<string, string> = {
  "Bazar ertəsi": "Monday",
  "Çərşənbə axşamı": "Tuesday",
  Çərşənbə: "Wednesday",
  "Cümə axşamı": "Thursday",
  Cümə: "Friday",
  Şənbə: "Saturday",
  Bazar: "Sunday",
};

const getLectureTypeColor = (lectureType: string): Color => {
  if (lectureType === "Mühazirə") return Color.Green;
  if (lectureType === "Məşğələ") return Color.Blue;
  if (lectureType === "Laboratoriya") return Color.Purple;
  return Color.SecondaryText;
};

type WeekFilter = "current" | "upper" | "lower";

export default function Command() {
  const [weekFilter, setWeekFilter] = useState<WeekFilter>("current");

  const { isLoading, data: schedule } = useCachedPromise(getSchedule, [], {
    initialData: null,
    onError: async () => {
      await showToast({ style: Toast.Style.Failure, title: "Failed to fetch schedule" });
    },
  });

  const isCurrentWeekUpper = getWeek(new Date(), { weekStartsOn: 1 }) % 2 === 0;
  const currentWeekType = isCurrentWeekUpper ? "upper" : "lower";

  const shouldShowClass = (cls: Schedule["data"][number][0]) => {
    if (cls.week_type_name === "Daimi") return true;

    if (weekFilter === "current") {
      if (currentWeekType === "upper" && cls.week_type_name === "Üst həftə") return true;
      if (currentWeekType === "lower" && cls.week_type_name === "Alt həftə") return true;
      return false;
    }

    if (weekFilter === "upper") {
      return cls.week_type_name === "Üst həftə";
    }

    if (weekFilter === "lower") {
      return cls.week_type_name === "Alt həftə";
    }

    return true;
  };

  const getWeekTypeTitle = () => {
    if (weekFilter === "current") {
      return `Current Week (${currentWeekType === "upper" ? "Upper" : "Lower"})`;
    }
    if (weekFilter === "upper") return "Upper Week Schedule";
    if (weekFilter === "lower") return "Lower Week Schedule";
    return "Schedule";
  };

  const createFullScheduleMarkdown = () => {
    if (!schedule?.data) return "";

    let scheduleText = `# ${getWeekTypeTitle()}\n\n`;

    Object.entries(schedule.data).forEach(([dayAz, classes]) => {
      const dayEn = DAY_TRANSLATION[dayAz] || dayAz;
      const filteredClasses = classes.filter(shouldShowClass);

      if (filteredClasses.length === 0) return;

      scheduleText += `## ${dayEn} (${dayAz})\n\n`;

      filteredClasses.forEach((cls, index) => {
        const lecture_type =
          cls.lecture_type_name === "Mühazirə"
            ? "M"
            : cls.lecture_type_name === "Məşğələ"
              ? "m"
              : cls.lecture_type_name === "Laboratoriya"
                ? "L"
                : cls.lecture_type_name;
        scheduleText += `📅 **${cls.time}** | ${cls.subject} (${lecture_type})`;
        scheduleText += ` | ${cls.teacher}`;
        scheduleText += ` | ${cls.room || "000-0"}\n`;
        if (index < filteredClasses.length - 1) scheduleText += "\n";
      });

      scheduleText += "\n\n";
    });

    return scheduleText;
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search classes and teachers..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Week Filter"
          value={weekFilter}
          onChange={(newValue) => setWeekFilter(newValue as WeekFilter)}
        >
          <List.Dropdown.Item
            value="current"
            title={`Current Week (${currentWeekType === "upper" ? "Upper" : "Lower"})`}
            icon={Icon.Calendar}
          />
          <List.Dropdown.Item value="upper" title="Upper Week" icon={Icon.ChevronUp} />
          <List.Dropdown.Item value="lower" title="Lower Week" icon={Icon.ChevronDown} />
        </List.Dropdown>
      }
    >
      {/* Weekly Schedule */}
      {schedule?.data &&
        Object.entries(schedule.data).map(([dayAz, classes]) => {
          const dayEn = DAY_TRANSLATION[dayAz] || dayAz;
          const filteredClasses = classes.filter(shouldShowClass);
          const isToday = dayAz === WEEK_DAYS_AZ[new Date().getDay()];

          if (filteredClasses.length === 0) return null;

          return (
            <List.Section key={dayAz} title={`${isToday ? "🔹 " : ""}${dayEn} (${dayAz})${isToday ? " - Today" : ""}`}>
              {filteredClasses.map((cls, index) => (
                <List.Item
                  key={`${dayAz}-${index}`}
                  title={cls.subject.slice(0, 35) + (cls.subject.length > 35 ? "..." : "")}
                  subtitle={`${cls.time} • ${cls.teacher}`}
                  icon={{
                    source: Icon.Book,
                    tintColor: getLectureTypeColor(cls.lecture_type_name),
                  }}
                  accessories={[
                    ...(cls.room
                      ? [
                          {
                            text: cls.room ? cls.room.slice(-3) + "-" + cls.room.slice(0, 1) : cls.room,
                            icon: {
                              source: Icon.Building,
                              tintColor: Color.SecondaryText,
                            },
                          },
                        ]
                      : []),
                    {
                      text: cls.lecture_type_name,
                      icon: {
                        source: Icon.Dot,
                        tintColor: getLectureTypeColor(cls.lecture_type_name),
                      },
                    },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard
                        title="Copy Class Info"
                        content={`${cls.subject}\nTime: ${cls.time}\nTeacher: ${cls.teacher}\nType: ${cls.lecture_type_name}\nRoom: ${cls.room || "TBA"}`}
                        icon={Icon.CopyClipboard}
                      />
                      <Action.CopyToClipboard title="Copy Teacher Name" content={cls.teacher} icon={Icon.Person} />
                      <Action.CopyToClipboard
                        title="Copy Full Schedule as Markdown"
                        content={createFullScheduleMarkdown()}
                        icon={Icon.Clipboard}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          );
        })}

      <List.EmptyView
        icon={Icon.Calendar}
        title="No Schedule Available"
        description="No classes found for this week. Please check back later."
      />
    </List>
  );
}
