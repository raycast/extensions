import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { SpringEasing } from "../models/easings";
import { saveCustomEasing } from "../utils/storage";

export function AddEasingForm({ onEasingAdded }: { onEasingAdded: () => void }) {
  const [nameError, setNameError] = useState<string | undefined>();
  const [massError, setMassError] = useState<string | undefined>();
  const [stiffnessError, setStiffnessError] = useState<string | undefined>();
  const [dampingError, setDampingError] = useState<string | undefined>();

  // Helper functions to clear errors when input changes
  function clearNameError() {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }

  function clearMassError() {
    if (massError && massError.length > 0) {
      setMassError(undefined);
    }
  }

  function clearStiffnessError() {
    if (stiffnessError && stiffnessError.length > 0) {
      setStiffnessError(undefined);
    }
  }

  function clearDampingError() {
    if (dampingError && dampingError.length > 0) {
      setDampingError(undefined);
    }
  }

  // Validation functions
  function validateName(value: string | undefined): boolean {
    if (!value || !value.trim()) {
      setNameError("Name is required");
      return false;
    }
    return true;
  }

  function validateMass(value: string | undefined): boolean {
    if (!value) {
      setMassError("Mass is required");
      return false;
    }

    const mass = parseFloat(value);
    if (isNaN(mass) || mass <= 0 || mass > 10) {
      setMassError("Mass must be a positive number between 0 and 10");
      return false;
    }
    return true;
  }

  function validateStiffness(value: string | undefined): boolean {
    if (!value) {
      setStiffnessError("Stiffness is required");
      return false;
    }

    const stiffness = parseFloat(value);
    if (isNaN(stiffness) || stiffness <= 0 || stiffness > 1000) {
      setStiffnessError("Stiffness must be a positive number between 0 and 1000");
      return false;
    }
    return true;
  }

  function validateDamping(value: string | undefined): boolean {
    if (!value) {
      setDampingError("Damping is required");
      return false;
    }

    const damping = parseFloat(value);
    if (isNaN(damping) || damping <= 0 || damping > 100) {
      setDampingError("Damping must be a positive number between 0 and 100");
      return false;
    }
    return true;
  }

  async function handleSubmit(values: { name: string; mass: string; stiffness: string; damping: string }) {
    // Validate all inputs on submit
    const isNameValid = validateName(values.name);
    const isMassValid = validateMass(values.mass);
    const isStiffnessValid = validateStiffness(values.stiffness);
    const isDampingValid = validateDamping(values.damping);

    if (!isNameValid || !isMassValid || !isStiffnessValid || !isDampingValid) {
      return;
    }

    // Create and save the new easing
    const newEasing: SpringEasing = {
      name: values.name.trim(),
      url: "", // Custom easings don't have URLs
      values: {
        mass: parseFloat(values.mass),
        stiffness: parseFloat(values.stiffness),
        damping: parseFloat(values.damping),
      },
    };

    try {
      await saveCustomEasing(newEasing);
      await showToast(Toast.Style.Success, "Easing added successfully");
      onEasingAdded();
    } catch (error) {
      console.error("Failed to save easing:", error);
      await showToast(Toast.Style.Failure, "Failed to save easing");
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Easing" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Boioioioing"
        error={nameError}
        onChange={clearNameError}
        onBlur={(event) => {
          validateName(event.target.value);
        }}
      />

      <Form.TextField
        id="mass"
        title="Mass"
        placeholder="1.0"
        error={massError}
        onChange={clearMassError}
        onBlur={(event) => {
          validateMass(event.target.value);
        }}
      />

      <Form.TextField
        id="stiffness"
        title="Stiffness"
        placeholder="100"
        error={stiffnessError}
        onChange={clearStiffnessError}
        onBlur={(event) => {
          validateStiffness(event.target.value);
        }}
      />

      <Form.TextField
        id="damping"
        title="Damping"
        placeholder="10"
        error={dampingError}
        onChange={clearDampingError}
        onBlur={(event) => {
          validateDamping(event.target.value);
        }}
      />
    </Form>
  );
}
