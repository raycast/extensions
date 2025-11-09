import { ActionPanel, Action, List, Icon, Form, useNavigation, confirmAlert, Alert } from "@raycast/api";
import { useState } from "react";
import { useClassTypes } from "./hooks/useClassTypes";
import { ClassType } from "./types";

export default function Settings() {
  const { classTypes, isLoading, removeClassType } = useClassTypes();

  async function handleDelete(classType: ClassType) {
    const confirmed = await confirmAlert({
      title: "Delete Class Type",
      message: `Are you sure you want to delete "${classType.name}"? This cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await removeClassType(classType.id, classType.name);
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle="Settings" searchBarPlaceholder="Search class types...">
      <List.Section title="Class Types">
        {classTypes.map((classType) => (
          <List.Item
            key={classType.id}
            title={classType.name}
            subtitle={`Major: ${classType.majorWeight}%, Minor: ${classType.minorWeight}%`}
            icon={Icon.Tag}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Class Type"
                  icon={Icon.Pencil}
                  target={<ClassTypeForm classTypeToEdit={classType} />}
                />
                <Action.Push
                  title="Add Class Type"
                  icon={Icon.Plus}
                  target={<ClassTypeForm />}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
                <Action
                  title="Delete Class Type"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(classType)}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Actions">
        <List.Item
          title="Add New Class Type"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action.Push title="Add Class Type" icon={Icon.Plus} target={<ClassTypeForm />} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

interface ClassTypeFormProps {
  classTypeToEdit?: ClassType;
}

function ClassTypeForm({ classTypeToEdit }: ClassTypeFormProps) {
  const { pop } = useNavigation();
  const { createClassType, updateClassType } = useClassTypes();

  const [name, setName] = useState(classTypeToEdit?.name || "");
  const [majorWeight, setMajorWeight] = useState(classTypeToEdit?.majorWeight.toString() || "50");
  const [minorWeight, setMinorWeight] = useState(classTypeToEdit?.minorWeight.toString() || "50");
  const [weightError, setWeightError] = useState<string | undefined>();

  function validateWeights(major: string, minor: string) {
    const majorNum = parseFloat(major);
    const minorNum = parseFloat(minor);

    if (isNaN(majorNum) || isNaN(minorNum)) {
      setWeightError("Weights must be valid numbers");
      return false;
    }

    if (majorNum < 0 || majorNum > 100 || minorNum < 0 || minorNum > 100) {
      setWeightError("Weights must be between 0 and 100");
      return false;
    }

    if (Math.abs(majorNum + minorNum - 100) > 0.01) {
      setWeightError("Weights must add up to 100%");
      return false;
    }

    setWeightError(undefined);
    return true;
  }

  function handleMajorWeightChange(value: string) {
    setMajorWeight(value);
    const majorNum = parseFloat(value);
    if (!isNaN(majorNum)) {
      const newMinor = (100 - majorNum).toString();
      setMinorWeight(newMinor);
      validateWeights(value, newMinor);
    }
  }

  function handleMinorWeightChange(value: string) {
    setMinorWeight(value);
    validateWeights(majorWeight, value);
  }

  async function handleSubmit() {
    if (!validateWeights(majorWeight, minorWeight)) return;

    const classType: ClassType = {
      id: classTypeToEdit?.id || `classtype-${Date.now()}`,
      name,
      majorWeight: parseFloat(majorWeight),
      minorWeight: parseFloat(minorWeight),
    };

    if (classTypeToEdit) {
      await updateClassType(classType);
    } else {
      await createClassType(classType);
    }

    pop();
  }

  return (
    <Form
      navigationTitle={classTypeToEdit ? "Edit Class Type" : "Add Class Type"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={classTypeToEdit ? "Update Class Type" : "Add Class Type"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="e.g., AP, Honors, Academic" value={name} onChange={setName} />
      <Form.TextField
        id="majorWeight"
        title="Major Weight (%)"
        placeholder="0-100"
        value={majorWeight}
        onChange={handleMajorWeightChange}
        error={weightError}
      />
      <Form.TextField
        id="minorWeight"
        title="Minor Weight (%)"
        placeholder="0-100"
        value={minorWeight}
        onChange={handleMinorWeightChange}
      />
      <Form.Description
        text={`Total: ${(parseFloat(majorWeight || "0") + parseFloat(minorWeight || "0")).toFixed(1)}%`}
      />
    </Form>
  );
}
