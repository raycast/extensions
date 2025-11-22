import { Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";

interface StepSizeFormProps {
  currentStepSize: string;
  onStepSizeChanged: (stepSize: string) => void;
}

export function StepSizeForm({ currentStepSize, onStepSizeChanged }: StepSizeFormProps) {
  const { pop } = useNavigation();
  const [stepSize, setStepSize] = useState<string>(currentStepSize);

  function handleSubmit(values: { stepSize: string }): void {
    try {
      const stepValue = parseInt(values.stepSize || "1", 10);
      if (isNaN(stepValue) || stepValue <= 0) {
        showFailureToast({ title: "Invalid Step Size", message: "Step size must be a positive integer" });
        return;
      }
      // Ensure it's a whole number string
      onStepSizeChanged(stepValue.toString());
      pop();
    } catch (error) {
      showFailureToast({ title: "Error", message: error instanceof Error ? error.message : "Failed to set step size" });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Step Size" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="stepSize"
        title="Step Size"
        value={stepSize}
        onChange={setStepSize}
        placeholder="1"
        info="The increment/decrement step for pixel size and blur adjustments"
      />
    </Form>
  );
}
