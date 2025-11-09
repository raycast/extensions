import { Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import { useState } from "react";
import { useAssignments } from "./hooks/useAssignments";
import { Assignment, Class } from "./types";

interface AddAssignmentProps {
  classItem: Class;
  assignmentToEdit?: Assignment;
}

export default function AddAssignment({ classItem, assignmentToEdit }: AddAssignmentProps) {
  const { pop } = useNavigation();
  const { createAssignment, updateAssignment } = useAssignments(classItem.id);

  const [name, setName] = useState(assignmentToEdit?.name || "");
  const [grade, setGrade] = useState(assignmentToEdit?.grade.toString() || "");
  const [type, setType] = useState<string>(assignmentToEdit?.type || "major");
  const [gradeError, setGradeError] = useState<string | undefined>();

  function validateGrade(value: string) {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0 || num > 100) {
      setGradeError("Grade must be between 0 and 100");
    } else {
      setGradeError(undefined);
    }
  }

  function handleGradeChange(value: string) {
    setGrade(value);
    validateGrade(value);
  }

  async function handleSubmit() {
    if (gradeError || !grade) return;

    const assignment: Assignment = {
      id: assignmentToEdit?.id || `assignment-${Date.now()}`,
      classId: classItem.id,
      name,
      grade: parseFloat(grade),
      type: type as "major" | "minor",
      quarter: assignmentToEdit?.quarter || classItem.currentQuarter,
    };

    if (assignmentToEdit) {
      await updateAssignment(assignment);
    } else {
      await createAssignment(assignment);
    }

    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={assignmentToEdit ? "Update Assignment" : "Add Assignment"}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`Adding assignment to ${classItem.name} (Quarter ${assignmentToEdit?.quarter || classItem.currentQuarter})`}
      />
      <Form.TextField id="name" title="Assignment Name" placeholder="e.g., Test 1" value={name} onChange={setName} />
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
