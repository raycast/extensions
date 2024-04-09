import { List, getPreferenceValues } from "@raycast/api";
import { getPersonioToken } from "./api/api";
import { useEffect, useState } from "react";
import { AttendancePeriod, getAttendances } from "./api/attendances";

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "Septemnber",
  "October",
  "November",
  "December",
];

export default function Attendances() {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const [attendances, setAttendances] = useState<AttendancePeriod[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const paddedMonth = (selectedMonth + 1).toString().padStart(2, "0");

  useEffect(() => {
    async function fetchAttendances() {
      const token = await getPersonioToken();
      const employeeNumber = getPreferenceValues().employeeNumber;

      // API call
      const attendances = await getAttendances(employeeNumber, token, currentYear.toString(), paddedMonth);

      // sort from new to old attendances
      const sortedAttendances = attendances.sort((a, b) => {
        return Date.parse(b.date + " " + b.start_time) - Date.parse(a.date + " " + a.start_time);
      });

      setAttendances(sortedAttendances);
    }
    fetchAttendances();
  }, [selectedMonth]);

  return (
    <List
      isShowingDetail={true}
      isLoading={attendances.length == 0}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Month and Year"
          defaultValue={months[currentMonth]}
          onChange={(month: string) => {
            setSelectedMonth(months.indexOf(month));
          }}
        >
          <List.Dropdown.Section title="Month">
            {months.map((month) => (
              <List.Dropdown.Item key={month} title={month} value={month} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {attendances.map((attendance) => (
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
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}
