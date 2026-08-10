import { Action, ActionPanel, List } from "@raycast/api";
import { AttendancePeriod, uniqueDateFilter } from "../api/attendances";
import { MONTHS, hoursToNiceString } from "../utils/date";

function computeTotalHours(attendances: AttendancePeriod[]) {
  let totalHours = 0;
  for (const attendance of attendances) {
    totalHours = totalHours + attendance.duration;
  }
  return totalHours;
}

function computeAttendanceDays(attendances: AttendancePeriod[]) {
  const attendanceDays = uniqueDateFilter(attendances).length;
  return attendanceDays;
}

export function AttendanceList(props: {
  attendances: AttendancePeriod[];
  defaultMonth: string;
  selectedMonth: number;
  onDropdownChange: (value: string) => void;
  onRefresh: () => void;
}) {
  return (
    <List
      isShowingDetail={true}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Month and Year"
          defaultValue={props.defaultMonth}
          onChange={props.onDropdownChange}
        >
          <List.Dropdown.Section title="Month">
            {MONTHS.map((month) => (
              <List.Dropdown.Item key={month} title={month} value={month} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {props.attendances.map((attendance) => (
        <List.Item
          key={attendance.id}
          title={attendance.date}
          subtitle={attendance.start_time + " - " + attendance.end_time}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Date" text={attendance.date || "-"} />
                  <List.Item.Detail.Metadata.Label title="Start" text={attendance.start_time || "-"} />
                  <List.Item.Detail.Metadata.Label title="End" text={attendance.end_time || "-"} />
                  <List.Item.Detail.Metadata.Label
                    title="Duration"
                    text={hoursToNiceString(attendance.duration) || "-"}
                  />
                  <List.Item.Detail.Metadata.Label title="Break" text={attendance.break.toString() + " minutes"} />
                  <List.Item.Detail.Metadata.Label title="Updated At" text={attendance.updated_at || "-"} />
                  <List.Item.Detail.Metadata.Label title="Acceptance Status" text={attendance.status || "-"} />

                  <List.Item.Detail.Metadata.TagList title="Attendance Status">
                    {attendance?.is_on_time_off && <List.Item.Detail.Metadata.TagList.Item text="Time Off" />}
                    {attendance?.is_holiday && <List.Item.Detail.Metadata.TagList.Item text="Holiday" />}
                    {!attendance?.is_holiday && !attendance?.is_on_time_off && (
                      <List.Item.Detail.Metadata.TagList.Item text="Work" />
                    )}
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Label title="Comment" text={attendance.comment || "-"} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title={`Total Hours in ${MONTHS[props.selectedMonth]}`}
                    text={hoursToNiceString(computeTotalHours(props.attendances))}
                  />
                  <List.Item.Detail.Metadata.Label
                    title={`Total Attendances in ${MONTHS[props.selectedMonth]}`}
                    text={computeAttendanceDays(props.attendances).toString()}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action title="Refresh Data" onAction={props.onRefresh} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
