import React from "react";
import { Form, showToast, Toast, popToRoot, ActionPanel, Action } from "@raycast/api";
import { ClockField } from "../lib/clock-fields";

export interface ClockFormProps {
  fields: ClockField[];
  rememberedValues: Record<string, string>;
  onSubmit: (values: Record<string, string>, rememberFlags: Record<string, boolean>) => Promise<void>;
}

/**
 * Clock Form Component
 * Renders a dynamic form based on detected fields with remember checkboxes
 */
export function ClockForm(props: ClockFormProps) {
  const { fields, rememberedValues, onSubmit } = props;

  const handleSubmit = async (values: Record<string, Form.Value>) => {
    try {
      const { values: extractedValues, rememberFlags } = extractFormValues(values);
      await onSubmit(extractedValues, rememberFlags);
      await showToast({
        style: Toast.Style.Success,
        title: "Form Submitted",
        message: "Clock values saved successfully",
      });
      popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to submit form",
      });
    }
  };

  // Find specific fields
  const clockInField = fields.find((f) => f.name === "clockInTime");
  const clockOutField = fields.find((f) => f.name === "clockOutTime");
  const spotField = fields.find((f) => f.name === "group_id");
  const notesField = fields.find((f) => f.name === "notice");

  // Get remembered values with defaults
  const clockInValue = rememberedValues.clockInTime || clockInField?.defaultValue || "10:00";
  const clockOutValue = rememberedValues.clockOutTime || clockOutField?.defaultValue || "19:00";
  const spotValue = rememberedValues.group_id || spotField?.defaultValue || "";
  const notesValue = rememberedValues.notice || notesField?.defaultValue || "";

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {/* 1. Clock In */}
      <Form.TextField
        id="clockInTime"
        title="Clock In"
        placeholder="HH:MM (e.g., 10:00)"
        defaultValue={clockInValue}
        storeValue={false}
      />
      {/* 2. Checkbox to remember clock in */}
      <Form.Checkbox
        id="remember_clockInTime"
        label="Remember Clock In"
        defaultValue={!!rememberedValues.clockInTime}
        storeValue={false}
      />

      {/* 3. Clock Out */}
      <Form.TextField
        id="clockOutTime"
        title="Clock Out"
        placeholder="HH:MM (e.g., 19:00)"
        defaultValue={clockOutValue}
        storeValue={false}
      />
      {/* 4. Checkbox to remember clock out */}
      <Form.Checkbox
        id="remember_clockOutTime"
        label="Remember Clock Out"
        defaultValue={!!rememberedValues.clockOutTime}
        storeValue={false}
      />

      {/* 5. Clock-in/out spot */}
      {spotField && spotField.type === "select" && spotField.options ? (
        <Form.Dropdown id="group_id" title="Clock-in/out Spot" defaultValue={spotValue} storeValue={false}>
          {spotField.options.map((option) => (
            <Form.Dropdown.Item key={option.value} value={option.value} title={option.label} />
          ))}
        </Form.Dropdown>
      ) : (
        <Form.TextField
          id="group_id"
          title="Clock-in/out Spot"
          placeholder="Spot name or ID"
          defaultValue={spotValue}
          storeValue={false}
        />
      )}
      {/* 6. Checkbox to remember spot */}
      <Form.Checkbox
        id="remember_group_id"
        label="Remember Clock-in/out Spot"
        defaultValue={!!rememberedValues.group_id}
        storeValue={false}
      />

      {/* 7. Notes */}
      <Form.TextField
        id="notice"
        title="Notes"
        placeholder="Enter notes"
        defaultValue={notesValue}
        storeValue={false}
      />
      {/* 8. Checkbox to remember notes */}
      <Form.Checkbox
        id="remember_notice"
        label="Remember Notes"
        defaultValue={!!rememberedValues.notice}
        storeValue={false}
      />
    </Form>
  );
}

/**
 * Extract values and remember flags from form values
 */
export function extractFormValues(formValues: Record<string, Form.Value>): {
  values: Record<string, string>;
  rememberFlags: Record<string, boolean>;
} {
  const values: Record<string, string> = {};
  const rememberFlags: Record<string, boolean> = {};

  // Extract the specific fields we're using
  const fieldNames = ["clockInTime", "clockOutTime", "group_id", "notice"];

  for (const fieldName of fieldNames) {
    const fieldValue = formValues[fieldName];
    if (fieldValue !== undefined) {
      // Properly handle different Form.Value types
      if (typeof fieldValue === "boolean") {
        values[fieldName] = fieldValue ? "true" : "false";
      } else if (Array.isArray(fieldValue)) {
        values[fieldName] = fieldValue.join(",");
      } else {
        values[fieldName] = String(fieldValue);
      }
    }

    const rememberFieldName = `remember_${fieldName}`;
    const rememberValue = formValues[rememberFieldName];
    if (rememberValue !== undefined) {
      rememberFlags[fieldName] = Boolean(rememberValue);
    }
  }

  return { values, rememberFlags };
}
