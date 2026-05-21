import { List, showToast, Toast, Color, Icon, Action, ActionPanel } from "@raycast/api";
import { getAttendance } from "./data/attendance";
import { Attendance } from "./components/lecture/attendance";
import { usePromise } from "@raycast/utils";

export const getStatusText = (percent: string): string => {
  const numericPercent = parseInt(percent.replace("%", ""));
  if (numericPercent >= 85) return "Excellent";
  if (numericPercent >= 75) return "Good";
  return "Cannot Attend Exam";
};

export default function Command() {
  const { isLoading, data: attendance } = usePromise(getAttendance, [], {
    onError: async () => {
      await showToast(Toast.Style.Failure, "Failed to fetch attendance");
    },
  });

  const getAttendanceColor = (percent: string): Color => {
    const numericPercent = parseInt(percent.replace("%", ""));
    if (numericPercent >= 85) return Color.Green;
    if (numericPercent >= 75) return Color.Orange;
    return Color.Red;
  };

  const getAttendanceIcon = (percent: string): Icon => {
    const numericPercent = parseInt(percent.replace("%", ""));
    if (numericPercent >= 85) return Icon.CheckCircle;
    if (numericPercent >= 75) return Icon.ExclamationMark;
    return Icon.XMarkCircle;
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search lectures...">
      {attendance?.map((lecture) => (
        <List.Item
          key={lecture.lecture_id}
          title={lecture.lecture_name}
          icon={{
            source: getAttendanceIcon(lecture.attendance_percent),
            tintColor: getAttendanceColor(lecture.attendance_percent),
          }}
          accessories={[
            { text: lecture.attendance_percent },
            {
              text: getStatusText(lecture.attendance_percent),
              icon: {
                source: Icon.Dot,
                tintColor: getAttendanceColor(lecture.attendance_percent),
              },
            },
            {
              text: `Score: ${lecture.attendance_score}/10`,
              icon: Icon.Star,
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Details"
                target={<Attendance lectureId={lecture.lecture_id} />}
                icon={Icon.Eye}
              />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && (!attendance || attendance.length === 0) && (
        <List.EmptyView
          icon={Icon.Calendar}
          title="No Attendance Data"
          description="No attendance records found for this semester."
        />
      )}
    </List>
  );
}
