import { ActionPanel, Action, List, Icon, Color, Form, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { useAssignments } from "./hooks/useAssignments";
import { useClassTypes } from "./hooks/useClassTypes";
import { calculateGrades, formatGrade } from "./calculations";
import { Class, Assignment } from "./types";

interface ProjectGradeProps {
  classItem: Class;
}

export default function ProjectGrade({ classItem }: ProjectGradeProps) {
  const { assignments: realAssignments } = useAssignments(classItem.id);
  const { classTypes } = useClassTypes();
  const [projectedAssignments, setProjectedAssignments] = useState<Assignment[]>([]);
  const [selectedQuarter, setSelectedQuarter] = useState<1 | 2>(classItem.currentQuarter);

  const classType = classTypes.find((ct) => ct.id === classItem.classTypeId);

  // Initialize projected assignments with real assignments
  useEffect(() => {
    setProjectedAssignments([...realAssignments]);
  }, [realAssignments]);

  const realGrades = classType
    ? calculateGrades(realAssignments, classType, selectedQuarter, classItem.q1ManualGrade, classItem.q2ManualGrade)
    : { quarterGrade: null, semesterGrade: null };

  const projectedGrades = classType
    ? calculateGrades(
        projectedAssignments,
        classType,
        selectedQuarter,
        classItem.q1ManualGrade,
        classItem.q2ManualGrade,
      )
    : { quarterGrade: null, semesterGrade: null };

  const quarterAssignments = projectedAssignments.filter((a) => a.quarter === selectedQuarter);
  const majorAssignments = quarterAssignments.filter((a) => a.type === "major");
  const minorAssignments = quarterAssignments.filter((a) => a.type === "minor");

  function resetProjections() {
    setProjectedAssignments([...realAssignments]);
  }

  function updateProjectedAssignment(id: string, newGrade: number) {
    setProjectedAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, grade: newGrade } : a)));
  }

  function deleteProjectedAssignment(id: string) {
    setProjectedAssignments((prev) => prev.filter((a) => a.id !== id));
  }

  function addHypotheticalAssignment(assignment: Assignment) {
    setProjectedAssignments((prev) => [...prev, assignment]);
  }

  const isModified = JSON.stringify(realAssignments) !== JSON.stringify(projectedAssignments);

  return (
    <List
      navigationTitle={`Project Grade - ${classItem.name}`}
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
      <List.Section title="Grade Comparison">
        <List.Item
          title="Current Quarter Grade"
          subtitle={formatGrade(realGrades.quarterGrade)}
          icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
          accessories={[{ text: "Actual" }]}
        />
        <List.Item
          title="Projected Quarter Grade"
          subtitle={formatGrade(projectedGrades.quarterGrade)}
          icon={{ source: Icon.Calculator, tintColor: Color.Blue }}
          accessories={[
            {
              text: isModified
                ? `${projectedGrades.quarterGrade && realGrades.quarterGrade ? (projectedGrades.quarterGrade > realGrades.quarterGrade ? "+" : "") + (projectedGrades.quarterGrade - realGrades.quarterGrade).toFixed(2) + "%" : "Modified"}`
                : "No changes",
            },
          ]}
          actions={
            <ActionPanel>
              {isModified && (
                <Action
                  title="Reset Projections"
                  icon={Icon.Undo}
                  onAction={resetProjections}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              )}
              <Action.Push
                title="Add Hypothetical Assignment"
                icon={Icon.Plus}
                target={
                  <HypotheticalAssignmentForm
                    classItem={classItem}
                    quarter={selectedQuarter}
                    onAdd={addHypotheticalAssignment}
                  />
                }
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Current Semester Grade"
          subtitle={formatGrade(realGrades.semesterGrade)}
          icon={{ source: Icon.Star, tintColor: Color.Green }}
          accessories={[{ text: "Actual" }]}
        />
        <List.Item
          title="Projected Semester Grade"
          subtitle={formatGrade(projectedGrades.semesterGrade)}
          icon={{ source: Icon.Calculator, tintColor: Color.Blue }}
          accessories={[
            {
              text: isModified
                ? `${projectedGrades.semesterGrade && realGrades.semesterGrade ? (projectedGrades.semesterGrade > realGrades.semesterGrade ? "+" : "") + (projectedGrades.semesterGrade - realGrades.semesterGrade).toFixed(2) + "%" : "Modified"}`
                : "No changes",
            },
          ]}
          actions={
            <ActionPanel>
              {isModified && (
                <Action
                  title="Reset Projections"
                  icon={Icon.Undo}
                  onAction={resetProjections}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              )}
              <Action.Push
                title="Add Hypothetical Assignment"
                icon={Icon.Plus}
                target={
                  <HypotheticalAssignmentForm
                    classItem={classItem}
                    quarter={selectedQuarter}
                    onAdd={addHypotheticalAssignment}
                  />
                }
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {majorAssignments.length > 0 && (
        <List.Section title={`Major (${classType?.majorWeight || 50}%)`}>
          {majorAssignments.map((assignment) => {
            const realAssignment = realAssignments.find((a) => a.id === assignment.id);
            const isHypothetical = !realAssignment;
            const isModifiedGrade = realAssignment && realAssignment.grade !== assignment.grade;

            return (
              <List.Item
                key={assignment.id}
                title={assignment.name}
                subtitle={`${assignment.grade}%`}
                icon={isHypothetical ? { source: Icon.QuestionMark, tintColor: Color.Orange } : Icon.Document}
                accessories={[
                  isHypothetical
                    ? { text: "Hypothetical", icon: { source: Icon.QuestionMark, tintColor: Color.Orange } }
                    : isModifiedGrade
                      ? {
                          text: `Original: ${realAssignment.grade}%`,
                          icon: { source: Icon.Pencil, tintColor: Color.Blue },
                        }
                      : {},
                ]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Modify Grade"
                      icon={Icon.Pencil}
                      target={<ModifyGradeForm assignment={assignment} onUpdate={updateProjectedAssignment} />}
                    />
                    {isHypothetical && (
                      <Action
                        title="Remove Hypothetical"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() => deleteProjectedAssignment(assignment.id)}
                      />
                    )}
                    <Action.Push
                      title="Add Hypothetical Assignment"
                      icon={Icon.Plus}
                      target={
                        <HypotheticalAssignmentForm
                          classItem={classItem}
                          quarter={selectedQuarter}
                          onAdd={addHypotheticalAssignment}
                        />
                      }
                    />
                    {isModified && (
                      <Action
                        title="Reset All Projections"
                        icon={Icon.Undo}
                        onAction={resetProjections}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                      />
                    )}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {minorAssignments.length > 0 && (
        <List.Section title={`Minor (${classType?.minorWeight || 50}%)`}>
          {minorAssignments.map((assignment) => {
            const realAssignment = realAssignments.find((a) => a.id === assignment.id);
            const isHypothetical = !realAssignment;
            const isModifiedGrade = realAssignment && realAssignment.grade !== assignment.grade;

            return (
              <List.Item
                key={assignment.id}
                title={assignment.name}
                subtitle={`${assignment.grade}%`}
                icon={isHypothetical ? { source: Icon.QuestionMark, tintColor: Color.Orange } : Icon.Document}
                accessories={[
                  isHypothetical
                    ? { text: "Hypothetical", icon: { source: Icon.QuestionMark, tintColor: Color.Orange } }
                    : isModifiedGrade
                      ? {
                          text: `Original: ${realAssignment.grade}%`,
                          icon: { source: Icon.Pencil, tintColor: Color.Blue },
                        }
                      : {},
                ]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Modify Grade"
                      icon={Icon.Pencil}
                      target={<ModifyGradeForm assignment={assignment} onUpdate={updateProjectedAssignment} />}
                    />
                    {isHypothetical && (
                      <Action
                        title="Remove Hypothetical"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() => deleteProjectedAssignment(assignment.id)}
                      />
                    )}
                    <Action.Push
                      title="Add Hypothetical Assignment"
                      icon={Icon.Plus}
                      target={
                        <HypotheticalAssignmentForm
                          classItem={classItem}
                          quarter={selectedQuarter}
                          onAdd={addHypotheticalAssignment}
                        />
                      }
                    />
                    {isModified && (
                      <Action
                        title="Reset All Projections"
                        icon={Icon.Undo}
                        onAction={resetProjections}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                      />
                    )}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}

interface ModifyGradeFormProps {
  assignment: Assignment;
  onUpdate: (id: string, newGrade: number) => void;
}

function ModifyGradeForm({ assignment, onUpdate }: ModifyGradeFormProps) {
  const { pop } = useNavigation();
  const [grade, setGrade] = useState(assignment.grade.toString());
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

  function handleSubmit() {
    if (!validateGrade(grade)) return;
    onUpdate(assignment.id, parseFloat(grade));
    pop();
  }

  return (
    <Form
      navigationTitle={`Modify ${assignment.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Grade" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Original Grade: ${assignment.grade}%`} />
      <Form.TextField
        id="grade"
        title="New Grade (%)"
        placeholder="0-100"
        value={grade}
        onChange={handleGradeChange}
        error={gradeError}
      />
    </Form>
  );
}

interface HypotheticalAssignmentFormProps {
  classItem: Class;
  quarter: 1 | 2;
  onAdd: (assignment: Assignment) => void;
}

function HypotheticalAssignmentForm({ classItem, quarter, onAdd }: HypotheticalAssignmentFormProps) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [type, setType] = useState<string>("major");
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

  function handleSubmit() {
    if (!validateGrade(grade)) return;

    const assignment: Assignment = {
      id: `hypothetical-${Date.now()}`,
      classId: classItem.id,
      name,
      grade: parseFloat(grade),
      type: type as "major" | "minor",
      quarter,
    };

    onAdd(assignment);
    pop();
  }

  return (
    <Form
      navigationTitle="Add Hypothetical Assignment"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Assignment" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Adding hypothetical assignment to Quarter ${quarter}`} />
      <Form.TextField
        id="name"
        title="Assignment Name"
        placeholder="e.g., Final Exam"
        value={name}
        onChange={setName}
      />
      <Form.TextField
        id="grade"
        title="Grade (%)"
        placeholder="0-100"
        value={grade}
        onChange={handleGradeChange}
        error={gradeError}
      />
      <Form.Dropdown id="type" title="Type" value={type} onChange={setType}>
        <Form.Dropdown.Item value="major" title="Major" />
        <Form.Dropdown.Item value="minor" title="Minor" />
      </Form.Dropdown>
    </Form>
  );
}
