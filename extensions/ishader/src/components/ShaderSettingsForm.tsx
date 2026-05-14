import { Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { ShaderConfig, ShaderParameter } from "../config/shaders";
import { ParametersRecord } from "../config/types";

interface ShaderSettingsFormProps {
  shaderConfig: ShaderConfig;
  parameters: ParametersRecord;
  onSettingsChanged: (updates: ParametersRecord) => void;
}

export function ShaderSettingsForm({ shaderConfig, parameters, onSettingsChanged }: ShaderSettingsFormProps) {
  const { pop } = useNavigation();

  // Initialize form state from current parameters
  const [formValues, setFormValues] = useState<ParametersRecord>(() => {
    const initial: ParametersRecord = {};
    shaderConfig.parameters.forEach((param) => {
      initial[param.id] = parameters[param.id] ?? param.default;
    });
    return initial;
  });

  function handleSubmit() {
    try {
      // Validate all parameters
      const errors: string[] = [];

      shaderConfig.parameters.forEach((param) => {
        const value = formValues[param.id];

        // Skip validation for parameters that don't need it
        if (param.type === "bool" || param.type === "string") {
          if (param.type === "string" && (!value || String(value).length === 0)) {
            errors.push(`${param.label} cannot be empty`);
          }
          return;
        }

        if (param.type === "float" || param.type === "int") {
          const numValue = Number(value);
          if (isNaN(numValue)) {
            errors.push(`${param.label} must be a number`);
            return;
          }

          if (param.min !== undefined && numValue < param.min) {
            errors.push(`${param.label} must be at least ${param.min}`);
          }
          if (param.max !== undefined && numValue > param.max) {
            errors.push(`${param.label} must be at most ${param.max}`);
          }
        }

        if (param.type === "enum") {
          const options = param.options || [];
          const valueStr = String(value);
          if (!options.find((opt) => opt.value === valueStr)) {
            errors.push(`${param.label} has invalid value`);
          }
        }
      });

      if (errors.length > 0) {
        showFailureToast({ title: "Validation Error", message: errors[0] });
        return;
      }

      // Convert values to appropriate types
      const updates: ParametersRecord = {};
      shaderConfig.parameters.forEach((param) => {
        const value = formValues[param.id];
        switch (param.type) {
          case "int": {
            const parsed = parseInt(String(value), 10);
            const numValue = isNaN(parsed) ? ((param.default as number) ?? 0) : parsed;
            updates[param.id] = numValue;
            break;
          }
          case "float": {
            const parsed = parseFloat(String(value));
            const numValue = isNaN(parsed) ? ((param.default as number) ?? 0) : parsed;
            updates[param.id] = numValue;
            break;
          }
          case "bool":
            updates[param.id] = Boolean(value);
            break;
          default:
            updates[param.id] = value;
        }
      });

      onSettingsChanged(updates);
      pop();
    } catch (error) {
      showFailureToast({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to update settings",
      });
    }
  }

  function renderFormField(param: ShaderParameter) {
    const value = formValues[param.id];
    const fieldId = param.id;

    switch (param.type) {
      case "bool":
        return (
          <Form.Checkbox
            key={fieldId}
            id={fieldId}
            label={param.label}
            value={Boolean(value)}
            onChange={(checked) => setFormValues((prev) => ({ ...prev, [fieldId]: checked }))}
            info={param.info}
          />
        );

      case "int":
        return (
          <Form.TextField
            key={fieldId}
            id={fieldId}
            title={param.label}
            value={String(value ?? param.default)}
            onChange={(text) => setFormValues((prev) => ({ ...prev, [fieldId]: text }))}
            placeholder={String(param.default)}
            info={
              param.info ||
              `${param.min !== undefined ? `Min: ${param.min}, ` : ""}${param.max !== undefined ? `Max: ${param.max}` : ""}`
            }
          />
        );

      case "float":
        return (
          <Form.TextField
            key={fieldId}
            id={fieldId}
            title={param.label}
            value={String(value ?? param.default)}
            onChange={(text) => setFormValues((prev) => ({ ...prev, [fieldId]: text }))}
            placeholder={String(param.default)}
            info={
              param.info ||
              `${param.min !== undefined ? `Min: ${param.min}, ` : ""}${param.max !== undefined ? `Max: ${param.max}` : ""}${param.step ? `, Step: ${param.step}` : ""}`
            }
          />
        );

      case "enum":
        return (
          <Form.Dropdown
            key={fieldId}
            id={fieldId}
            title={param.label}
            value={String(value ?? param.default)}
            onChange={(selectedValue) => setFormValues((prev) => ({ ...prev, [fieldId]: selectedValue }))}
            info={param.info}
          >
            {param.options?.map((option) => (
              <Form.Dropdown.Item key={option.value} value={option.value} title={option.label} />
            ))}
          </Form.Dropdown>
        );

      case "string":
        return (
          <Form.TextArea
            key={fieldId}
            id={fieldId}
            title={param.label}
            value={String(value ?? param.default)}
            onChange={(text) => setFormValues((prev) => ({ ...prev, [fieldId]: text }))}
            placeholder={String(param.default)}
            info={param.info}
          />
        );

      default:
        return null;
    }
  }

  // Parameters are already sorted by order, but group by category for better UX
  const effectParams = shaderConfig.parameters.filter((p) => p.category === "effect");
  const preprocessingParams = shaderConfig.parameters.filter((p) => p.category === "preprocessing");
  const commonParams = shaderConfig.parameters.filter((p) => p.category === "common");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Apply Settings" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title={shaderConfig.name}
        text={shaderConfig.description || `Configure settings for ${shaderConfig.name} effect`}
      />

      {/* Effect parameters first (most important) */}
      {effectParams.length > 0 && (
        <>
          <Form.Separator />
          <Form.Description title="Effect Parameters" text="" />
          {effectParams.map((param) => renderFormField(param))}
        </>
      )}

      {/* Common parameters next */}
      {commonParams.length > 0 && (
        <>
          <Form.Separator />
          {commonParams.map((param) => renderFormField(param))}
        </>
      )}

      {/* Preprocessing parameters last */}
      {preprocessingParams.length > 0 && (
        <>
          <Form.Separator />
          <Form.Description title="Preprocessing Parameters" text="" />
          {preprocessingParams.map((param) => renderFormField(param))}
        </>
      )}
    </Form>
  );
}
