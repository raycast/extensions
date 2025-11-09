import { Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { useClasses } from "./hooks/useClasses";
import { useClassTypes } from "./hooks/useClassTypes";
import { Class } from "./types";

interface AddClassProps {
  classToEdit?: Class;
}

export default function AddClass({ classToEdit }: AddClassProps) {
  const { pop } = useNavigation();
  const { createClass, updateClass } = useClasses();
  const { classTypes, isLoading } = useClassTypes();

  const [name, setName] = useState(classToEdit?.name || "");
  const [classTypeId, setClassTypeId] = useState(classToEdit?.classTypeId || "");
  const [currentQuarter, setCurrentQuarter] = useState<string>(classToEdit?.currentQuarter.toString() || "1");

  // Set default class type when types load
  useEffect(() => {
    if (!classToEdit && classTypes.length > 0 && !classTypeId) {
      setClassTypeId(classTypes[0].id);
    }
  }, [classTypes, classTypeId, classToEdit]);

  async function handleSubmit() {
    const classItem: Class = {
      id: classToEdit?.id || `class-${Date.now()}`,
      name,
      classTypeId,
      currentQuarter: parseInt(currentQuarter) as 1 | 2,
    };

    if (classToEdit) {
      await updateClass(classItem);
    } else {
      await createClass(classItem);
    }

    pop();
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={classToEdit ? "Update Class" : "Add Class"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Class Name" placeholder="e.g., AP Calculus BC" value={name} onChange={setName} />
      <Form.Dropdown id="classTypeId" title="Class Type" value={classTypeId} onChange={setClassTypeId}>
        {classTypes.map((type) => (
          <Form.Dropdown.Item
            key={type.id}
            value={type.id}
            title={`${type.name} (Major: ${type.majorWeight}%, Minor: ${type.minorWeight}%)`}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="currentQuarter" title="Current Quarter" value={currentQuarter} onChange={setCurrentQuarter}>
        <Form.Dropdown.Item value="1" title="Quarter 1" />
        <Form.Dropdown.Item value="2" title="Quarter 2" />
      </Form.Dropdown>
    </Form>
  );
}
