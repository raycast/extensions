import { List, Icon, Color, ActionPanel, Action } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getLectureAttendance, getLectureAttendanceDetails } from "@/data/lecture/attendance";

export function Attendance({ lectureId }: { lectureId: string }) {
  const { data: summary, isLoading: summaryLoading } = useCachedPromise(getLectureAttendance, [lectureId]);

  const { data: details, isLoading: detailsLoading } = useCachedPromise(getLectureAttendanceDetails, [lectureId]);

  const isLoading = summaryLoading || detailsLoading;
  const student = details?.students?.[0];
  const totalAbsent = student?.attendance.filter((a) => a.status === "2").length || 0;

  const getStatusIcon = (status: string | null): Icon => {
    if (status === "1") return Icon.CheckCircle;
    if (status === "2") return Icon.XMarkCircle;
    return Icon.Minus;
  };

  const getStatusColor = (status: string | null): Color => {
    if (status === "1") return Color.Green;
    if (status === "2") return Color.Red;
    return Color.SecondaryText;
  };

  const getStatusText = (status: string | null): string => {
    if (status === "1") return "Attended";
    if (status === "2") return "Absent";
    return "—";
  };

  const getMethodName = (method: string | null): string => {
    if (method === "M") return "Lecture";
    if (method === "S") return "Practice";
    if (method === "L") return "Laboratory";
    return "";
  };

  const getMethodIcon = (method: string | null): Icon => {
    if (method === "M") return Icon.Book;
    if (method === "S") return Icon.Pencil;
    if (method === "L") return Icon.ComputerChip;
    return Icon.Document;
  };

  const getMethodColor = (method: string | null): Color => {
    if (method === "M") return Color.Blue;
    if (method === "S") return Color.Green;
    if (method === "L") return Color.Purple;
    return Color.SecondaryText;
  };

  const createAttendanceReport = () => {
    if (!summary || !student) return "";

    let report = `# Attendance Report\n\n`;

    // Professors
    report += `## Professors\n`;
    if (summary.professor.lecture_professor_name) {
      report += `- **Lecture:** ${summary.professor.lecture_professor_name}\n`;
    }
    if (summary.professor.training_professor_name) {
      report += `- **Practice:** ${summary.professor.training_professor_name}\n`;
    }
    if (summary.professor.laboratory_professor_name) {
      report += `- **Laboratory:** ${summary.professor.laboratory_professor_name}\n`;
    }

    // Summary
    report += `\n## Summary\n`;
    report += `- **Attendance:** ${student.scores.attendance_percent}\n`;
    report += `- **Total Hours:** ${summary.hours}\n`;
    report += `- **Credits:** ${summary.score}\n`;
    report += `- **Score:** ${student.scores.total_score}\n`;
    report += `- **Absent:** ${totalAbsent} lessons\n`;

    // Detailed Attendance
    report += `\n## Detailed Attendance\n\n`;
    student.attendance.forEach((att, index) => {
      const dateInfo = details?.lecture_info.dates[index];
      const status = getStatusText(att.status);
      report += `**Lesson ${att.week_num}** - ${status}\n`;
      if (dateInfo?.date) {
        report += `- Date: ${dateInfo.date}\n`;
        report += `- Type: ${getMethodName(dateInfo.method)}\n`;
      }
      report += `\n`;
    });

    return report;
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search lessons...">
      {/* Summary Section */}
      {summary && student && (
        <>
          <List.Section title="📊 Summary">
            {/* Attendance Percentage */}
            <List.Item
              title="Attendance Rate"
              subtitle={student.scores.attendance_percent}
              icon={{
                source: Icon.BarChart,
                tintColor: Color.Blue,
              }}
              accessories={[
                {
                  text: `${student.scores.total_score} points`,
                  icon: {
                    source: Icon.Trophy,
                    tintColor: Color.Yellow,
                  },
                },
                totalAbsent > 0
                  ? {
                      text: `${totalAbsent} absent`,
                      icon: {
                        source: Icon.XMarkCircle,
                        tintColor: Color.Red,
                      },
                    }
                  : {},
              ]}
            />

            {/* Hours and Credits */}
            <List.Item
              title="Total Hours"
              subtitle={`${summary.hours} hours`}
              icon={{
                source: Icon.Clock,
                tintColor: Color.Purple,
              }}
              accessories={[
                {
                  text: `${summary.score} credits`,
                  icon: {
                    source: Icon.Star,
                    tintColor: Color.Orange,
                  },
                },
              ]}
            />
          </List.Section>

          {/* Professors Section */}
          {(summary.professor.lecture_professor_name ||
            summary.professor.training_professor_name ||
            summary.professor.laboratory_professor_name) && (
            <List.Section title="👨‍🏫 Professors">
              {summary.professor.lecture_professor_name && (
                <List.Item
                  title="Lecture"
                  subtitle={summary.professor.lecture_professor_name}
                  icon={{
                    source: Icon.Book,
                    tintColor: Color.Blue,
                  }}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard
                        title="Copy Professor Name"
                        content={summary.professor.lecture_professor_name}
                        icon={Icon.CopyClipboard}
                      />
                    </ActionPanel>
                  }
                />
              )}

              {summary.professor.training_professor_name && (
                <List.Item
                  title="Practice"
                  subtitle={summary.professor.training_professor_name}
                  icon={{
                    source: Icon.Pencil,
                    tintColor: Color.Green,
                  }}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard
                        title="Copy Professor Name"
                        content={summary.professor.training_professor_name}
                        icon={Icon.CopyClipboard}
                      />
                    </ActionPanel>
                  }
                />
              )}

              {summary.professor.laboratory_professor_name && (
                <List.Item
                  title="Laboratory"
                  subtitle={summary.professor.laboratory_professor_name}
                  icon={{
                    source: Icon.ComputerChip,
                    tintColor: Color.Orange,
                  }}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard
                        title="Copy Professor Name"
                        content={summary.professor.laboratory_professor_name}
                        icon={Icon.CopyClipboard}
                      />
                    </ActionPanel>
                  }
                />
              )}
            </List.Section>
          )}

          {/* Detailed Attendance */}
          <List.Section title={`📅 Attendance Details (${student.attendance.length} lessons)`}>
            {student.attendance.map((attendance, index) => {
              const dateInfo = details?.lecture_info.dates[index];
              const status = attendance.status;

              return (
                <List.Item
                  key={attendance.week_num}
                  title={`Lesson ${attendance.week_num}`}
                  subtitle={dateInfo?.date ? `${dateInfo.date} • ${getMethodName(dateInfo?.method)}` : ""}
                  icon={{
                    source: getMethodIcon(dateInfo?.method || null),
                    tintColor: getMethodColor(dateInfo?.method || null),
                  }}
                  accessories={[
                    dateInfo.date ? { text: dateInfo.mod_date, icon: Icon.Pencil } : {},
                    {
                      icon: {
                        source: getStatusIcon(status),
                        tintColor: getStatusColor(status),
                      },
                    },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard
                        title="Copy Lesson Info"
                        content={`Lesson ${attendance.week_num}: ${getStatusText(status)}${dateInfo?.date ? `\nDate: ${dateInfo.date}` : ""}${dateInfo?.method ? `\nType: ${getMethodName(dateInfo.method)}` : ""}`}
                        icon={Icon.CopyClipboard}
                      />
                      <Action.CopyToClipboard
                        title="Copy Full Report"
                        content={createAttendanceReport()}
                        icon={Icon.Clipboard}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        </>
      )}

      <List.EmptyView
        icon={Icon.Calendar}
        title="No Attendance Data"
        description="Unable to load attendance details for this subject."
      />
    </List>
  );
}
