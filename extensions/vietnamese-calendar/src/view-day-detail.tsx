import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import {
  getDayOccurrences,
  getLunarDayOccurrences,
  getFullDetail,
  getDateDiff,
} from "./utils/date-utils";
import { SolarDate } from "lunar-date-vn";
import { getHoliday, isOfficialHoliday, isLunarEvent } from "./utils/holidays";

interface Props {
  date: Date;
}

type DateType = "solar" | "lunar";

export default function DayDetailView({ date: initialDate }: Props) {
  const [occurrences, setOccurrences] = useState<Date[]>([]);

  // manualDateType will be null until the user explicitly changes the dropdown.
  // This allows the smart default (isLunarEvent) to win on every new date.
  const [manualDateType, setManualDateType] = useState<DateType | null>(null);

  const initialLunarCheck = isLunarEvent(initialDate);
  const dateType = manualDateType ?? (initialLunarCheck ? "lunar" : "solar");

  // Reset manual override when the date changes
  useEffect(() => {
    setManualDateType(null);
  }, [initialDate]);

  // Calculate occurrences based on the effective dateType
  useEffect(() => {
    const dates =
      dateType === "solar"
        ? getDayOccurrences(initialDate, 0, 10)
        : getLunarDayOccurrences(initialDate, 0, 10);

    setOccurrences(dates);
  }, [initialDate, dateType]);

  const initialSelectionId =
    occurrences
      .find((d) => d.getFullYear() === initialDate.getFullYear())
      ?.toISOString() || initialDate.toISOString();

  return (
    <List
      isShowingDetail
      selectedItemId={initialSelectionId}
      searchBarAccessory={
        <List.Dropdown
          tooltip="View as Solar or Lunar"
          value={dateType}
          onChange={(val) => {
            setManualDateType(val as DateType);
          }}
        >
          <List.Dropdown.Item
            title="Solar Cycle"
            value="solar"
            icon={Icon.Sun}
          />
          <List.Dropdown.Item
            title="Lunar Cycle"
            value="lunar"
            icon={Icon.Moon}
          />
        </List.Dropdown>
      }
    >
      {occurrences.map((date) => {
        const details = getFullDetail(date);
        const solar = new SolarDate(date);
        const lunar = solar.toLunarDate();
        const lunarInfo = lunar ? lunar.get() : { day: 0, month: 0, year: 0 };
        const holiday = getHoliday(date, lunarInfo.day, lunarInfo.month);
        const isOfficial = isOfficialHoliday(
          date,
          lunarInfo.day,
          lunarInfo.month,
        );

        return (
          <List.Item
            key={date.toISOString()}
            id={date.toISOString()}
            title={format(date, "EEE, MMM d yyyy")}
            subtitle={getDateDiff(date)}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Date"
                      text={format(date, "dd/MM/yyyy")}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="For Human"
                      text={format(date, "EEEE, MMMM do, yyyy")}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Relative"
                      text={getDateDiff(date)}
                    />
                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label
                      title="Week of Year"
                      text={details.weekOfYear.toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Day of Year"
                      text={details.dayOfYear.toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Day of Week"
                      text={details.dayOfWeek}
                    />
                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label
                      title="Lunar Date"
                      text={`${lunarInfo.day}/${lunarInfo.month}/${lunarInfo.year}`}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Year"
                      text={details.canChi.year}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Month"
                      text={details.canChi.month}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Day"
                      text={details.canChi.day}
                    />

                    {holiday && (
                      <>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label
                          title="Holiday"
                          text={holiday}
                          icon={
                            isOfficial
                              ? { source: Icon.Star, tintColor: "#FF6363" }
                              : undefined
                          }
                        />
                      </>
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  content={`${format(date, "dd/MM/yyyy")} - ${lunarInfo.day}/${lunarInfo.month} - ${details.canChi.year}`}
                  title="Copy Date Info"
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
