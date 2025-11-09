import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useClasses } from "./hooks/useClasses";
import { useClassTypes } from "./hooks/useClassTypes";
import { useAssignments } from "./hooks/useAssignments";
import { calculateGrades, formatGrade } from "./calculations";
import ClassDetail from "./class-detail";
import AddClass from "./add-class";
import Settings from "./settings";

export default function Command() {
  const { classes, isLoading: classesLoading, removeClass } = useClasses();
  const { classTypes, isLoading: typesLoading } = useClassTypes();
  const { assignments, isLoading: assignmentsLoading } = useAssignments();

  const isLoading = classesLoading || typesLoading || assignmentsLoading;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search classes...">
      {classes.length === 0 ? (
        <List.EmptyView
          title="No Classes Yet"
          description="Add your first class to get started"
          icon={Icon.Book}
          actions={
            <ActionPanel>
              <Action.Push title="Add Class" icon={Icon.Plus} target={<AddClass />} />
              <Action.Push title="Settings" icon={Icon.Gear} target={<Settings />} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {classes.map((classItem) => {
            const classType = classTypes.find((ct) => ct.id === classItem.classTypeId);
            const classAssignments = assignments.filter((a) => a.classId === classItem.id);

            // Calculate both Q1 and Q2 grades for list view
            const q1Grades = classType
              ? calculateGrades(classAssignments, classType, 1, classItem.q1ManualGrade, classItem.q2ManualGrade)
              : { quarterGrade: null, semesterGrade: null };

            const q2Grades = classType
              ? calculateGrades(classAssignments, classType, 2, classItem.q1ManualGrade, classItem.q2ManualGrade)
              : { quarterGrade: null, semesterGrade: null };

            return (
              <List.Item
                key={classItem.id}
                title={classItem.name}
                subtitle={classType?.name || "Unknown Type"}
                accessories={[
                  { text: `Q1: ${formatGrade(q1Grades.quarterGrade)}` },
                  { text: `Q2: ${formatGrade(q2Grades.quarterGrade)}` },
                  { text: `Semester: ${formatGrade(q1Grades.semesterGrade)}` },
                ]}
                actions={
                  <ActionPanel>
                    <Action.Push title="View Class" icon={Icon.Eye} target={<ClassDetail classItem={classItem} />} />
                    <Action.Push title="Add Class" icon={Icon.Plus} target={<AddClass />} />
                    <Action.Push
                      title="Edit Class"
                      icon={Icon.Pencil}
                      target={<AddClass classToEdit={classItem} />}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                    />
                    <Action
                      title="Delete Class"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => removeClass(classItem.id, classItem.name)}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    />
                    <ActionPanel.Section>
                      <Action.Push
                        title="Settings"
                        icon={Icon.Gear}
                        target={<Settings />}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </>
      )}
      {classes.length > 0 && (
        <List.Section title="Actions">
          <List.Item
            title="Add New Class"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action.Push title="Add Class" icon={Icon.Plus} target={<AddClass />} />
              </ActionPanel>
            }
          />
          <List.Item
            title="Settings"
            icon={Icon.Gear}
            actions={
              <ActionPanel>
                <Action.Push title="Settings" icon={Icon.Gear} target={<Settings />} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
