import { List, getPreferenceValues } from "@raycast/api";
import { AttendancePeriod, getAttendances, getPersonioToken } from "./api";
import { useEffect, useState } from "react";

export default function Attendances() {
  const [attendances, setAttendances] = useState<AttendancePeriod[]>([]);

  useEffect(() => {
    async function fetchAttendances() {
      const token = await getPersonioToken();
      const employeeNumber = getPreferenceValues().employeeNumber;
      const attendances = await getAttendances(employeeNumber, token);
      setAttendances(attendances);
    }
    fetchAttendances();
  }, []);

  return (
    <List isShowingDetail={true} isLoading={attendances.length == 0}>
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
