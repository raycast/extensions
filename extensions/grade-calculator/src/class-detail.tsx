import { ActionPanel, Action, List, Icon, Color, Form, useNavigation, confirmAlert, Alert } from "@raycast/api";
import { useState } from "react";
import { useAssignments } from "./hooks/useAssignments";
import { useClassTypes } from "./hooks/useClassTypes";
import { useClasses } from "./hooks/useClasses";
import { calculateGrades, formatGrade } from "./calculations";
import { Class, Assignment } from "./types";
import AddAssignment from "./add-assignment";
import AddClass from "./add-class";
import ProjectGrade from "./project-grade";

interface ClassDetailProps {
  classItem: Class;
}

export default function ClassDetail({ classItem: initialClassItem }: ClassDetailProps) {
  const [selectedQuarter, setSelectedQuarter] = useState<1 | 2>(initialClassItem.currentQuarter);
  const { assignments, removeAssignment } = useAssignments(initialClassItem.id);
  const { classTypes } = useClassTypes();
  const { classes, updateClass } = useClasses();

  // Get the most up-to-date class item
  const classItem = classes.find((c) => c.id === initialClassItem.id) || initialClassItem;
  const classType = classTypes.find((ct) => ct.id === classItem.classTypeId);

  const quarterAssignments = assignments.filter((a) => a.quarter === selectedQuarter);
  const majorAssignments = quarterAssignments.filter((a) => a.type === "major");
  const minorAssignments = quarterAssignments.filter((a) => a.type === "minor");

  const grades = classType
    ? calculateGrades(assignments, classType, selectedQuarter, classItem.q1ManualGrade, classItem.q2ManualGrade)
    : { quarterGrade: null, semesterGrade: null };

  const currentManualGrade = selectedQuarter === 1 ? classItem.q1ManualGrade : classItem.q2ManualGrade;
  const hasManualGrade = currentManualGrade !== undefined && currentManualGrade !== null;

  async function toggleQuarter() {
    const newQuarter = selectedQuarter === 1 ? 2 : 1;
    setSelectedQuarter(newQuarter as 1 | 2);
  }

  async function switchCurrentQuarter() {
    const newQuarter = classItem.currentQuarter === 1 ? 2 : 1;
    const updatedClass = { ...classItem, currentQuarter: newQuarter as 1 | 2 };
    await updateClass(updatedClass);
  }

  async function clearManualGrade() {
    const confirmed = await confirmAlert({
      title: "Clear Manual Grade",
      message: `Remove the manual grade for Quarter ${selectedQuarter}? The grade will be calculated from assignments instead.`,
      primaryAction: {
        title: "Clear",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      const updatedClass = {
        ...classItem,
        ...(selectedQuarter === 1 ? { q1ManualGrade: null } : { q2ManualGrade: null }),
      };
      await updateClass(updatedClass);
    }
  }

  return (
    <List
      navigationTitle={classItem.name}
      searchBarPlaceholder="Search assignments..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Quarter"
          value={selectedQuarter.toString()}
          onChange={(newValue) => setSelectedQuarter(parseInt(newValue) as 1 | 2)}
        >
          <List.Dropdown.Item title="Quarter 1" value="1" />
          <List.Dropdown.Item title="Quarter 2" value="2" />
        </List.Dropdown>
      }
    >
      <List.Section title="Grade Summary">
        <List.Item
          title="Current Quarter Grade"
          subtitle={formatGrade(grades.quarterGrade)}
          icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
          accessories={[
            { text: `Quarter ${selectedQuarter}` },
            { text: classType ? `(${classType.name})` : "" },
            ...(hasManualGrade ? [{ text: "Manual", icon: { source: Icon.Pencil, tintColor: Color.Blue } }] : []),
          ]}
          actions={
            <ActionPanel>
              {hasManualGrade ? (
                <>
                  <Action.Push
                    title="Edit Manual Grade"
                    icon={Icon.Pencil}
                    target={<SetManualGrade classItem={classItem} quarter={selectedQuarter} />}
                  />
                  <Action
                    title="Clear Manual Grade"
                    icon={Icon.XMarkCircle}
                    style={Action.Style.Destructive}
                    onAction={clearManualGrade}
                  />
                </>
              ) : (
                <Action.Push
                  title="Set Manual Grade"
                  icon={Icon.Pencil}
                  target={<SetManualGrade classItem={classItem} quarter={selectedQuarter} />}
                />
              )}
              <Action.Push title="Add Assignment" icon={Icon.Plus} target={<AddAssignment classItem={classItem} />} />
              <Action
                title="Toggle Quarter View"
                icon={Icon.Switch}
                onAction={toggleQuarter}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              />
              <Action
                title="Switch Current Quarter"
                icon={Icon.Calendar}
                onAction={switchCurrentQuarter}
                shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
              />
              <Action.Push
                title="Project Grade"
                icon={Icon.Calculator}
                target={<ProjectGrade classItem={classItem} />}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Semester Grade"
          subtitle={formatGrade(grades.semesterGrade)}
          icon={{ source: Icon.Star, tintColor: Color.Blue }}
          accessories={[{ text: "Q1 + Q2" }]}
          actions={
            <ActionPanel>
              <Action.Push title="Add Assignment" icon={Icon.Plus} target={<AddAssignment classItem={classItem} />} />
              <Action
                title="Toggle Quarter View"
                icon={Icon.Switch}
                onAction={toggleQuarter}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              />
              <Action.Push
                title="Project Grade"
                icon={Icon.Calculator}
                target={<ProjectGrade classItem={classItem} />}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {quarterAssignments.length === 0 ? (
        <List.EmptyView
          title={`No Assignments in Quarter ${selectedQuarter}`}
          description="Add your first assignment to start tracking grades"
          icon={Icon.Document}
          actions={
            <ActionPanel>
              <Action.Push title="Add Assignment" icon={Icon.Plus} target={<AddAssignment classItem={classItem} />} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {majorAssignments.length > 0 && (
            <List.Section title={`Major (${classType?.majorWeight || 50}%)`}>
              {majorAssignments.map((assignment) => (
                <AssignmentItem
                  key={assignment.id}
                  assignment={assignment}
                  classItem={classItem}
                  removeAssignment={removeAssignment}
                />
              ))}
            </List.Section>
          )}

          {minorAssignments.length > 0 && (
            <List.Section title={`Minor (${classType?.minorWeight || 50}%)`}>
              {minorAssignments.map((assignment) => (
                <AssignmentItem
                  key={assignment.id}
                  assignment={assignment}
                  classItem={classItem}
                  removeAssignment={removeAssignment}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

interface AssignmentItemProps {
  assignment: Assignment;
  classItem: Class;
  removeAssignment: (id: string, name: string) => Promise<void>;
}

function AssignmentItem({ assignment, classItem, removeAssignment }: AssignmentItemProps) {
  return (
    <List.Item
      title={assignment.name}
      subtitle={`${assignment.grade}%`}
      icon={Icon.Document}
      actions={
        <ActionPanel>
          <Action.Push
            title="Edit Assignment"
            icon={Icon.Pencil}
            target={<AddAssignment classItem={classItem} assignmentToEdit={assignment} />}
          />
          <Action.Push title="Add Assignment" icon={Icon.Plus} target={<AddAssignment classItem={classItem} />} />
          <Action
            title="Delete Assignment"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() => removeAssignment(assignment.id, assignment.name)}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
          />
          <ActionPanel.Section>
            <Action.Push title="Edit Class" icon={Icon.Pencil} target={<AddClass classToEdit={classItem} />} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

interface SetManualGradeProps {
  classItem: Class;
  quarter: 1 | 2;
}

function SetManualGrade({ classItem, quarter }: SetManualGradeProps) {
  const { pop } = useNavigation();
  const { updateClass } = useClasses();

  const currentManualGrade = quarter === 1 ? classItem.q1ManualGrade : classItem.q2ManualGrade;
  const [grade, setGrade] = useState(currentManualGrade?.toString() || "");
  const [gradeError, setGradeError] = useState<string | undefined>();

  function validateGrade(value: string) {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0 || num > 100) {
      setGradeError("Grade must be between 0 and 100");
      return false;
    }
    setGradeError(undefined);
    return true;
  }

  function handleGradeChange(value: string) {
    setGrade(value);
    validateGrade(value);
  }

  async function handleSubmit() {
    if (!validateGrade(grade)) return;

    const updatedClass = {
      ...classItem,
      ...(quarter === 1 ? { q1ManualGrade: parseFloat(grade) } : { q2ManualGrade: parseFloat(grade) }),
    };

    await updateClass(updatedClass);
    pop();
  }

  return (
    <Form
      navigationTitle={`Set Manual Grade - Quarter ${quarter}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Grade" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`Set a manual grade for ${classItem.name} Quarter ${quarter}. This will override any grade calculated from assignments.`}
      />
      <Form.TextField
        id="grade"
        title="Grade (%)"
        placeholder="0-100"
        value={grade}
        onChange={handleGradeChange}
        error={gradeError}
      />
      {currentManualGrade !== undefined && currentManualGrade !== null && (
        <Form.Description text={`Current manual grade: ${currentManualGrade}%`} />
      )}
    </Form>
  );
}
